describe('Admin Prediction Deletion', () => {
    const adminUser = {
        _id: 'admin123',
        username: 'AdminUser',
        email: 'admin@example.com',
        isAdmin: true,
        isGoldenMember: false,
        following: []
    };

    const targetUser = {
        _id: 'user456',
        username: 'TargetUser',
        badges: [],
        watchlist: [],
        analystRating: { total: 100 }
    };

    const prediction = {
        _id: 'pred789',
        stockTicker: 'AAPL',
        targetPrice: 150,
        predictionType: 'Monthly',
        status: 'Active',
        createdAt: new Date().toISOString(),
        userId: targetUser
    };

    const mockQuotes = [
        { symbol: 'AAPL', regularMarketPrice: 145 }
    ];

    const mockPerformance = {
        overallAvgRating: 75.5,
        overallRank: 5,
        aggressiveness: null,
        byStock: []
    };

    beforeEach(() => {
        // 1. Mock Current User (Admin)
        cy.intercept('GET', '**/auth/current_user', {
            statusCode: 200,
            body: adminUser
        }).as('getCurrentUser');

        // 2. Mock Quotes (used in ProfilePage)
        cy.intercept('POST', '**/api/quotes', {
            statusCode: 200,
            body: mockQuotes
        }).as('getQuotes');

        // 3. Mock Profile Data (Initial Load)
        cy.intercept('GET', `**/api/profile/${targetUser._id}`, {
            statusCode: 200,
            body: {
                user: targetUser,
                predictions: [prediction],
                performance: mockPerformance,
                chartData: []
            }
        }).as('getProfile');

        // 4. Mock Delete API
        cy.intercept('DELETE', `**/api/admin/predictions/${prediction._id}`, {
            statusCode: 200,
            body: { message: 'Prediction deleted successfully' }
        }).as('deletePrediction');

        // (Refetch Mock removed from here to prevent leakage)
    });

    it('should allow admin to delete a prediction', () => {
        // Override the profile intercept for the FIRST call
        cy.intercept('GET', `**/api/profile/${targetUser._id}`, {
            statusCode: 200,
            body: {
                user: targetUser,
                predictions: [prediction],
                performance: mockPerformance,
                chartData: []
            }
        }).as('getProfileFirst');

        cy.visit(`/profile/${targetUser._id}`);
        cy.wait('@getProfileFirst');

        // Verify Prediction is visible
        cy.contains(prediction.stockTicker).should('be.visible');

        // Verify Delete Button is visible (Admin only)
        cy.get('button[title="Delete Prediction (Admin)"]').should('be.visible');

        // Click Delete
        cy.get('button[title="Delete Prediction (Admin)"]').click();

        // Verify Confirmation Modal appears
        cy.contains('Delete Prediction').should('be.visible'); // Custom title passed? No, ConfirmationModal uses "Are you sure?" usually?
        // Wait, ProfilePage passes: title={t('cancel_verification_title')} for verification.
        // For deletion, ProfilePage.jsx logic says:
        /*
            const handleDeleteClick = (predictionId) => {
                setPredictionToDeleteId(predictionId);
                setIsDeleteConfirmOpen(true);
            };
            ...
            <ConfirmationModal 
                isOpen={isDeleteConfirmOpen} 
                onClose={() => setIsDeleteConfirmOpen(false)} 
                onConfirm={confirmDeletePrediction} 
                title={t('prediction_delete_title', 'Delete Prediction')} 
                message={t('prediction_delete_msg', 'Are you sure you want to delete this prediction?')} 
            />
        */
        // I need to check if those keys exist or if fallback strings were used.
        // Assuming keys might not exist, but let's check for "Delete" text in general.
        // Or check for "Confirm" button.

        // Intercept the RE-FETCH that happens after delete to return empty list
        cy.intercept('GET', `**/api/profile/${targetUser._id}`, {
            statusCode: 200,
            body: {
                user: targetUser,
                predictions: [], // Gone
                performance: mockPerformance,
                chartData: []
            }
        }).as('getProfileSecond');

        // Click Confirm
        cy.contains('button', 'Confirm').click();

        // Verify API call
        cy.wait('@deletePrediction');

        // Verify Success Message (Toast)
        cy.contains('Prediction deleted successfully').should('be.visible');

        // Verify Refetch
        cy.wait('@getProfileSecond');

        // Verify Prediction is gone
        cy.contains(prediction.stockTicker).should('not.exist');
    });

    it('should NOT show delete button for non-admin', () => {
        // Mock Non-Admin User
        cy.intercept('GET', '**/auth/current_user', {
            statusCode: 200,
            body: { ...adminUser, isAdmin: false }
        }).as('getNonAdminUser');

        cy.visit(`/profile/${targetUser._id}`);

        // Should use the default 'getProfile' intercept which has predictions
        cy.contains(prediction.stockTicker).should('be.visible');

        // Assert Delete Button NOT exist
        cy.get('button[title="Delete Prediction (Admin)"]').should('not.exist');
    });
});

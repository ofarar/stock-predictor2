describe('Direction Accuracy Feature', () => {
    const user = {
        _id: 'test_user_id',
        username: 'TestUser1',
        email: 'test@example.com',
        analystRating: { total: 100 }
    };

    const predictions = [
        // Correct Direction (Up/Up)
        { _id: '1', status: 'Assessed', priceAtCreation: 100, targetPrice: 110, actualPrice: 105, predictionType: 'Weekly', userId: user },
        // Wrong Direction (Up/Down)
        { _id: '2', status: 'Assessed', priceAtCreation: 100, targetPrice: 110, actualPrice: 95, predictionType: 'Weekly', userId: user },
        // Correct Direction (Down/Down)
        { _id: '3', status: 'Assessed', priceAtCreation: 100, targetPrice: 90, actualPrice: 80, predictionType: 'Weekly', userId: user },
        // Wrong Direction (Down/Up)
        { _id: '4', status: 'Assessed', priceAtCreation: 100, targetPrice: 90, actualPrice: 110, predictionType: 'Weekly', userId: user },
    ];
    // Accuracy: 2/4 = 50%

    beforeEach(() => {
        // Mock Login
        cy.intercept('GET', '/api/auth/me', {
            statusCode: 200,
            body: user
        }).as('getMe');

        // Mock Profile Fetch
        cy.intercept('GET', `/api/users/${user._id}/profile`, {
            statusCode: 200,
            body: {
                user: user,
                predictions: predictions,
                performance: {
                    overallRank: 1,
                    overallAvgRating: 85,
                    totalPoints: 100,
                    aggressiveness: {
                        analyzedCount: 4,
                        distribution: { defensive: 1, neutral: 1, offensive: 2 },
                        overallScore: 15
                    }
                },
                totalAnalystRating: 1000
            }
        }).as('getProfile');

        // Force English
        cy.visit(`/profile/${user._id}`, {
            onBeforeLoad(win) {
                win.localStorage.setItem('i18nextLng', 'en');
            }
        });
        cy.wait('@getProfile');
    });

    it('should display Direction Accuracy bar with correct percentage on desktop', () => {
        cy.viewport(1280, 720); // Desktop

        // Check Title
        cy.contains('Direction Accuracy').should('be.visible');

        // Check Percentage (50%)
        cy.contains('50%').should('be.visible');

        // Check Details (2/4 Correct)
        cy.contains('2/4 Correct').should('be.visible');

        // Check Layout: Should be side-by-side with Aggressiveness
        // We can check if they share the same row or have specific classes, but visibility is key
        cy.contains('Prediction Style').should('be.visible');
    });

    it('should hide details by default on mobile and show on click', () => {
        cy.viewport('iphone-x'); // Mobile

        cy.contains('Direction Accuracy').should('be.visible');

        // Details and Percentage should be hidden initially (opacity 0)
        // Note: 'hidden' class might not be used, but opacity-0
        // Cypress 'be.visible' usually checks opacity > 0. 
        // If we implement with opacity-0, we might need 'have.class', 'opacity-0' 
        // OR check CSS property

        cy.contains('50%').should('have.class', 'opacity-0');
        cy.contains('2/4 Correct').should('have.class', 'opacity-0');

        // Click to toggle
        cy.contains('Direction Accuracy').click();

        // Should be visible now
        cy.contains('50%').should('not.have.class', 'opacity-0');
        cy.contains('2/4 Correct').should('not.have.class', 'opacity-0');
    });

    it('should open info modal when clicking info icon', () => {
        cy.viewport(1280, 720);

        // Find the info button inside Direction Accuracy component and click
        // Use a more specific selector if possible, or trigger traversal
        cy.contains('Direction Accuracy').parent().find('button').click();

        // Check Modal content
        cy.contains('Understanding Direction Accuracy').should('be.visible');
        cy.contains('How it works').should('be.visible');

        // Close Modal
        cy.contains('Close').click();
        cy.contains('Understanding Direction Accuracy').should('not.exist');
    });
});

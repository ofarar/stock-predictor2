describe('Direction Accuracy Feature', () => {
    const user = {
        _id: '5f8d0d55b54764421b7156d9', // Valid 24-char Hex ID
        username: 'TestUser1',
        email: 'test@example.com',
        analystRating: { total: 100 },
        // Add missing fields to preventing rendering crashes
        watchlist: [],
        badges: [],
        followers: [],
        following: [],
        goldenSubscriptions: [],
        isGoldenMember: false,
        isVerified: false,
        avatar: null,
        bio: 'Test Bio',
        createdAt: new Date().toISOString()
    };

    const predictions = [
        // Correct Direction (Up/Up)
        { _id: '5f8d0d55b54764421b7156a1', status: 'Assessed', priceAtCreation: 100, targetPrice: 110, actualPrice: 105, predictionType: 'Weekly', userId: user },
        // Wrong Direction (Up/Down)
        { _id: '5f8d0d55b54764421b7156a2', status: 'Assessed', priceAtCreation: 100, targetPrice: 110, actualPrice: 95, predictionType: 'Weekly', userId: user },
        // Correct Direction (Down/Down)
        { _id: '5f8d0d55b54764421b7156a3', status: 'Assessed', priceAtCreation: 100, targetPrice: 90, actualPrice: 80, predictionType: 'Weekly', userId: user },
        // Wrong Direction (Down/Up)
        { _id: '5f8d0d55b54764421b7156a4', status: 'Assessed', priceAtCreation: 100, targetPrice: 90, actualPrice: 110, predictionType: 'Weekly', userId: user },
    ];
    // Accuracy: 2/4 = 50%

    beforeEach(() => {
        cy.on('uncaught:exception', () => false); // Ignore ResizeObserver loop errors

        // Mock Login
        cy.intercept('GET', '**/auth/current_user', {
            statusCode: 200,
            body: user
        }).as('getMe');

        // Mock Settings
        cy.intercept('GET', '**/api/settings', {
            statusCode: 200,
            body: {
                isEarningsBannerActive: false,
                verificationPrice: 4.99,
                isPromoBannerActive: false
            }
        }).as('getSettings');

        // Mock Notifications (Prevent 401 logout)
        cy.intercept('GET', '**/api/notifications', {
            statusCode: 200,
            body: []
        }).as('getNotifications');

        // Mock View Count (Prevent 429 Too Many Requests)
        cy.intercept('POST', '**/api/users/*/view', {
            statusCode: 200,
            body: { success: true }
        }).as('postView');

        // Mock Profile Fetch
        cy.intercept('GET', `**/api/profile/${user._id}`, {
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

        // Wait for profile to load
        cy.contains('TestUser1').should('be.visible');

        // Check if ProfileStats is rendered by checking the first card
        cy.contains('Overall Rank').should('be.visible');

        // Check Direction Accuracy Title
        // Increase timeout just in case of animation/rendering delays
        cy.contains('Direction Accuracy', { timeout: 10000 }).should('be.visible');

        // Check Percentage (50%)
        cy.contains('50%').should('be.visible');

        // Check Details (2/4 Correct)
        cy.contains('2/4 Correct').should('be.visible');

        // Check Layout: Should be side-by-side with Aggressiveness
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

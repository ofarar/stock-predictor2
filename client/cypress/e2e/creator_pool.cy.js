describe('Creator Pool Modal', () => {
    const user = Cypress.env('testUser1');

    beforeEach(() => {
        cy.viewport(1920, 1080);
        cy.login(user.email, user.password);
        cy.visit('/');

        // Navigate to My Profile
        cy.get('img[alt="Avatar"]').click();
        cy.contains('My Profile').click();
        cy.url().should('include', '/profile/');
    });

    it('should open modal, show special border for current user, and open chart on click', () => {
        // Get the user ID from the URL
        cy.url().then(url => {
            const userId = url.split('/').pop();

            // Mock the leaderboard response to ensure the user is in the list with a high rating
            cy.intercept('GET', '**/api/leaderboard/rating', {
                statusCode: 200,
                body: {
                    totalAnalystRating: 5000,
                    users: [
                        {
                            _id: userId,
                            username: 'Test User', // Should match what's displayed or just be consistent
                            avatar: 'https://api.dicebear.com/8.x/lorelei/svg?seed=TestUser',
                            analystRating: {
                                total: 1000,
                                fromPredictions: 500,
                                fromBonus: 500,
                                predictionBreakdownByStock: { 'AAPL': { totalRating: 500, count: 5 } }
                            }
                        },
                        {
                            _id: 'other_user_id',
                            username: 'Other User',
                            avatar: 'https://api.dicebear.com/8.x/lorelei/svg?seed=Other',
                            analystRating: { total: 500 }
                        }
                    ]
                }
            }).as('getLeaderboard');

            // Get the username from the profile header to use in assertions
            cy.get('h1').invoke('text').then((username) => {
                // 1. Open Modal
                // Click the "Creator Pool Share" card in ProfileStats
                cy.contains('Creator Pool Share').click();

                // Wait for the mock response
                cy.wait('@getLeaderboard');

                // 2. Verify Modal Opens
                cy.contains('Creator Pool Leaderboard').should('be.visible');

                // Wait for leaderboard to load
                cy.contains('Total Analyst Rating on Platform').should('be.visible');

                // 3. Verify Special Border around the current user's row
                // The row should contain the username and have the specific classes
                // Note: We mocked the username as 'Test User' in the list, but the profile header might show something else.
                // However, the modal renders the username from the *leaderboard data*.
                // So we should look for 'Test User' (from our mock).
                cy.contains('button', 'Test User')
                    .should('have.class', 'ring-2')
                    .should('have.class', 'ring-green-400')
                    .as('userRow');

                // 4. Click the user's row to open the detail view (chart)
                cy.get('@userRow').click();

                // 5. Verify Detail View
                // Should show the user's name in the detail header
                cy.get('[data-testid="creator-pool-detail-view"]').within(() => {
                    cy.contains('Test User').should('be.visible');
                    cy.contains('Breakdown Details').should('be.visible');
                    // Verify the Pie chart canvas is present
                    cy.get('canvas').should('be.visible');
                });
            });
        });
    });
});

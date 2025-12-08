describe('Admin User List & Hourly Limit', () => {
    beforeEach(() => {
        // Mock the user list response
        cy.intercept('GET', '**/api/admin/all-users**', {
            statusCode: 200,
            body: [
                {
                    _id: 'test-user-id',
                    username: 'Testersaurus',
                    email: 'test@example.com',
                    avatar: 'https://example.com/avatar.png',
                    isVerified: true,
                    isGoldenMember: false,
                    predictionCount: 100, // High count
                    avgRating: 4.8,
                    followersCount: 50,
                    rateLimitHourly: 10, // Default
                    createdAt: new Date().toISOString()
                }
            ]
        }).as('getUsers');

        // Mock settings
        cy.intercept('GET', '**/api/admin/settings', {
            statusCode: 200,
            body: { isVerificationEnabled: true, isAIWizardEnabled: true }
        }).as('getSettings');

        // Mock Admin User Session
        cy.intercept('GET', '**/auth/current_user', {
            statusCode: 200,
            body: { _id: 'admin-id', username: 'Admin', email: 'ofarar@gmail.com', isAdmin: true }
        }).as('getCurrentUser');

        // Mock the PUT request for updating limit
        cy.intercept('PUT', '**/api/admin/users/test-user-id/limit', {
            statusCode: 200,
            body: { message: 'Limits updated' }
        }).as('updateLimit');
    });

    it('verifies user list layout and updates hourly limit', () => {
        cy.visit('/admin');

        // 1. Wait for data
        cy.wait('@getCurrentUser');
        cy.wait('@getUsers');

        // 2. Verify "Users" tab is active by default
        // In desktop view, the button should have the active class (bg-blue-600)
        // In mobile view (if cypress executes as mobile), it checks the select value.
        // We'll rely on content visibility.
        cy.contains('h2', 'User Management').should('be.visible');

        // 3. Verify Sort Dropdown exists
        cy.get('select').contains('Joined (Newest)').should('exist');

        // 4. Verify User Card Data
        cy.contains('Testersaurus').should('be.visible');
        cy.contains('Preds').should('exist');
        cy.contains('100').should('exist'); // Prediction Count
        cy.contains('Acc').should('exist');
        cy.contains('4.8').should('exist'); // Rating
        cy.contains('Joined:').should('exist'); // Joined Date

        // 5. Verify Waitlist is present (moved to Users tab)
        cy.contains('AI Portfolio Assist Waitlist').should('be.visible');

        // 6. Test Hourly Limit Update
        // Click edit button
        cy.get('button[title="Click to edit Hourly Limit"]').click();

        // Verify Modal
        cy.contains('Edit Hourly Rate Limit').should('be.visible');
        cy.get('input[placeholder="Default (10)"]').clear().type('25');
        cy.contains('button', 'Save Limit').click();

        // Verify API call
        cy.wait('@updateLimit').its('request.body').should('deep.equal', {
            hourlyLimit: 25
        });
    });
});

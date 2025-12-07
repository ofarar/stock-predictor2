describe('Admin Bot Governance', () => {
    const adminUser = {
        _id: 'admin123',
        username: 'AdminUser',
        email: 'admin@example.com',
        isAdmin: true, // Critical for access
        isGoldenMember: false,
        following: []
    };

    const pendingPrediction = {
        _id: 'pred_pending_1',
        stockTicker: 'NVDA',
        targetPrice: 150.00,
        priceAtCreation: 140.00,
        description: 'Bullish signal due to AI reasoning.',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        userId: {
            _id: 'bot_id',
            username: 'Sigma Alpha',
            isBot: true
        }
    };

    beforeEach(() => {
        // 1. Mock Admin User
        cy.intercept('GET', '**/auth/current_user', {
            statusCode: 200,
            body: adminUser
        }).as('getCurrentUser');

        // 2. Mock Pending Predictions
        cy.intercept('GET', '**/api/admin/predictions/pending', {
            statusCode: 200,
            body: [pendingPrediction]
        }).as('getPending');

        // 3. Mock Status Update API (Approve/Reject)
        cy.intercept('PUT', `**/api/admin/predictions/${pendingPrediction._id}/status`, (req) => {
            const newStatus = req.body.status;
            req.reply({
                statusCode: 200,
                body: { ...pendingPrediction, status: newStatus }
            });
        }).as('updateStatus');

        // Mock other Admin Page calls to avoid errors
        cy.intercept('GET', '**/api/admin/all-users**', { body: [] });
    });

    it('should display pending predictions and allow approval', () => {
        cy.visit('/admin');

        // Wait for data load
        cy.wait('@getPending');

        // 1. Verify UI Rendering
        cy.contains('Bot Governance').should('be.visible');
        cy.contains('NVDA').should('be.visible');
        cy.contains('AI BOT').should('be.visible'); // Badge check
        cy.contains('Bullish signal').should('be.visible');

        // 2. Click Approve
        cy.contains('button', 'Approve').click();

        // 3. Verify API payload
        cy.wait('@updateStatus').then((interception) => {
            expect(interception.request.body.status).to.equal('Active');
        });

        // 4. Verify UI Update (Item removed locally)
        cy.contains('NVDA').should('not.exist');
    });

    it('should allow rejection', () => {
        cy.visit('/admin');
        cy.wait('@getPending');

        // Click Reject
        cy.contains('button', 'Reject').click();

        // Verify API payload
        cy.wait('@updateStatus').then((interception) => {
            expect(interception.request.body.status).to.equal('Rejected');
        });

        // Verify UI removal
        cy.contains('NVDA').should('not.exist');
    });

    it('should show empty state when no predictions', () => {
        cy.intercept('GET', '**/api/admin/predictions/pending', {
            statusCode: 200,
            body: []
        }).as('getEmpty');

        cy.visit('/admin');
        cy.wait('@getEmpty');

        cy.contains('No pending predictions to review').should('be.visible');
    });

    it('should render long descriptions in a scrollable container', () => {
        const longText = 'Long rationale '.repeat(50); // ~750 chars
        const longPrediction = { ...pendingPrediction, description: longText, _id: 'pred_long' };

        cy.intercept('GET', '**/api/admin/predictions/pending', {
            statusCode: 200,
            body: [longPrediction]
        }).as('getLong');

        cy.visit('/admin');
        cy.wait('@getLong');

        // Check for the scrollable container class
        cy.contains(longText).should('have.class', 'overflow-y-auto');
        cy.contains(longText).should('have.class', 'max-h-60');
    });
});

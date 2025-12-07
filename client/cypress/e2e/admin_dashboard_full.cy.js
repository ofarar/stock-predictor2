describe('Admin Dashboard Full', () => {
    const adminUser = {
        _id: 'admin123',
        username: 'AdminUser',
        email: 'admin@example.com',
        isAdmin: true,
        isGoldenMember: false,
        following: []
    };

    const mockSettings = {
        isVerificationEnabled: true,
        verificationPrice: 4.99,
        isAIWizardEnabled: true,
        maxPredictionsPerDay: 20,
        badgeSettings: {},
        isFinanceApiEnabled: true,
        isPromoBannerActive: true,
        isEarningsBannerActive: true,
        isXIconEnabled: true,
        xAccountUrl: 'https://x.com/Example'
    };

    const mockUsers = [
        { _id: 'u1', username: 'Trader1', email: 't1@test.com', isAdmin: false, isBot: false },
        { _id: 'u2', username: 'SuperBot', email: 'bot@test.com', isAdmin: false, isBot: true }
    ];

    const mockHealthStr = JSON.stringify({
        server: "Online",
        database: "Connected",
        gemini: "Operational"
    });

    beforeEach(() => {
        // 1. Mock Admin Identity
        cy.intercept('GET', '**/auth/current_user', {
            statusCode: 200,
            body: adminUser
        }).as('getCurrentUser');

        // 2. Mock Settings
        cy.intercept('GET', '**/api/settings', {
            statusCode: 200,
            body: mockSettings
        }).as('getSettings');

        // 3. Mock Pending Predictions (Empty to test Governance Visibility fix)
        cy.intercept('GET', '**/api/admin/predictions/pending', {
            statusCode: 200,
            body: []
        }).as('getPending');

        // 4. Mock User List
        cy.intercept('GET', '**/api/admin/all-users*', {
            statusCode: 200,
            body: mockUsers
        }).as('getUsers');

        // 5. Mock Health Check Stream (Simulated via simple text or event source)
        // Since HealthCheck component often uses EventSource, Cypress mocking is tricky.
        // We will assume it renders the container at least.

        // 6. Mock Bot Trigger
        cy.intercept('POST', '**/api/admin/trigger-bot', {
            statusCode: 200,
            body: { message: "Triggered" }
        }).as('triggerBot');
    });

    it('should load the dashboard and show all major sections', () => {
        cy.visit('/admin');
        cy.wait('@getSettings');
        cy.wait('@getUsers');

        // Header
        cy.contains('h1', 'Admin Dashboard').should('be.visible');

        // Save Button
        cy.contains('button', 'Save All Settings').should('be.visible');

        // --- Bot Governance Section ---
        // Verify the Header covers the fix (should be visible even with 0 pending)
        cy.contains('Bot Governance').should('be.visible');
        cy.contains('Pending').should('be.visible');

        // Verify Control Buttons
        cy.contains('button', 'Run Daily Inference').should('be.visible');
        cy.contains('button', 'Run Quarterly Training').should('be.visible');

        // Verify Empty State Message
        cy.contains('No pending predictions to review').should('be.visible');

        // --- User List Section ---
        cy.contains('h2', 'User Management').should('be.visible');
        cy.contains('Trader1').should('be.visible'); // User from mock
        cy.contains('SuperBot').should('be.visible'); // Bot from mock

        // --- Health Check Section ---
        cy.contains('h2', 'System Health Check').should('be.visible');

        // --- General Settings Section ---
        cy.contains('h2', 'General Settings').should('be.visible');
        cy.contains('Show Global X/Twitter Icon').should('be.visible');
        cy.contains('Enable Promo Banner').should('be.visible');
        cy.contains('Enable Earnings Banner').should('be.visible');
        cy.contains('Enable Live Finance API').should('be.visible');
        cy.contains('Max Predictions Per Day').should('be.visible');

        // --- Other Features ---
        cy.contains('h2', 'AI Wizard Feature').should('be.visible');
        cy.contains('h2', 'Verification Feature').should('be.visible');
        cy.contains('h2', 'Badge Rules JSON Editor').should('be.visible');
    });

    it('should trigger bot actions', () => {
        cy.visit('/admin');

        // Click Daily Inference
        cy.contains('button', 'Run Daily Inference').click();
        cy.wait('@triggerBot').then((interception) => {
            expect(interception.request.body.mode).to.equal('inference');
        });

        // Verify Toast (if possible, but Toast often disappears fast)
        // cy.contains('Bot triggered').should('be.visible');

        // Click Quarterly Training
        cy.contains('button', 'Run Quarterly Training').click();
        cy.wait('@triggerBot').then((interception) => {
            expect(interception.request.body.mode).to.equal('train');
        });
    });
});

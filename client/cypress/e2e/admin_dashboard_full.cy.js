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

        // 3. Mock Pending Predictions
        cy.intercept('GET', '**/api/admin/predictions/pending', {
            statusCode: 200,
            body: []
        }).as('getPending');

        // 4. Mock User List
        cy.intercept('GET', '**/api/admin/all-users*', {
            statusCode: 200,
            body: mockUsers
        }).as('getUsers');

        // 5. Mock Bot Trigger
        cy.intercept('POST', '**/api/admin/trigger-bot', {
            statusCode: 200,
            body: { message: "Triggered" }
        }).as('triggerBot');

        // 6. Mock AI Wizard Waitlist (to prevent 403s)
        cy.intercept('GET', '**/api/admin/ai-wizard-waitlist', {
            statusCode: 200,
            body: []
        }).as('getWaitlist');
    });

    it('should load the dashboard and show all major sections', () => {
        cy.visit('/admin');
        cy.wait('@getSettings');
        cy.wait('@getUsers');

        // Header
        cy.contains('h1', 'Admin Dashboard').should('be.visible');

        // Note: Save Button is now in Settings Tab

        // --- Bot Governance Section ---
        // Click Tab
        cy.contains('button', 'Bot Governance').click();
        cy.wait(500); // small UI wait
        // Verify the Header
        cy.get('h2').contains('Bot Governance').should('be.visible');
        cy.contains('Pending').should('be.visible');

        // Verify Control Buttons
        cy.contains('button', 'Run Daily Inference').should('be.visible');
        cy.contains('button', 'Run Quarterly Training').should('be.visible');

        // Verify Empty State Message
        cy.contains('No pending predictions to review').should('be.visible');

        // --- User List Section (Default Tab) ---
        // Click Tab back
        cy.contains('button', 'Users').click();
        cy.contains('h2', 'User Management').should('be.visible');
        cy.contains('Trader1').should('be.visible'); // User from mock
        cy.contains('SuperBot').should('be.visible'); // Bot from mock

        // --- Health Check Section ---
        cy.contains('button', 'System Health').click();
        cy.contains('h2', 'System Health Check').should('be.visible');

        // --- Settings / Admin Options Section ---
        // "Admin Options" tab contains the AdminPanel component (Maintenance Buttons)
        cy.contains('button', 'Admin Options').click();
        cy.contains('h3', 'Admin Panel').should('be.visible');
        // Verify a maintenance button exists
        cy.contains('button', 'Evaluate Predictions Now').should('be.visible');
        cy.contains('button', 'Run AI Bot Engine').should('be.visible');

        // --- Settings Tab ---
        cy.contains('button', 'Settings').click();
        cy.contains('h2', 'Global Settings').should('be.visible');

        // General Features
        cy.contains('h3', 'General Features').should('be.visible');
        cy.contains('Show Footer X Icon').should('be.visible');
        cy.contains('Enable Promo Banner').should('be.visible');
        cy.contains('Enable Earnings Banner').should('be.visible');

        // Core Features
        cy.contains('h3', 'Core Features').should('be.visible');
        cy.contains('Enable Live Finance API').should('be.visible');
        cy.contains('Global Max Predictions / Day').should('be.visible');

        // Module Configs
        cy.contains('h3', 'Module Configs').should('be.visible');
        cy.contains('Enable AI Wizard').should('be.visible');
        cy.contains('Enable "Get Verified"').should('be.visible');

        // Badge Rules
        cy.contains('h2', 'Badge Rules JSON').should('be.visible');

        // Verify Save Button here
        cy.contains('button', 'Save Changes').should('be.visible');
    });

    it('should trigger bot actions', () => {
        cy.visit('/admin');

        // Navigate to Governance Tab first
        cy.contains('button', 'Bot Governance').click();

        // Click Daily Inference
        cy.contains('button', 'Run Daily Inference').click();
        cy.wait('@triggerBot').then((interception) => {
            expect(interception.request.body.mode).to.equal('inference');
        });

        // Click Quarterly Training
        cy.contains('button', 'Run Quarterly Training').click();
        cy.wait('@triggerBot').then((interception) => {
            expect(interception.request.body.mode).to.equal('train');
        });
    });
});

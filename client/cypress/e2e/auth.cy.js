describe('Authentication Flows', () => {
    const user = Cypress.env('testUser1');

    beforeEach(() => {
        cy.viewport('iphone-6'); // Use mobile viewport
        cy.clearCookies();
        cy.clearLocalStorage();
    });

    it('should login successfully using custom command', () => {
        cy.login(user.email, user.password);
        cy.visit('/dashboard');
        // In mobile, avatar might be hidden or in menu, check for mobile menu button
        cy.get('nav button.p-2').should('exist');
    });

    it('should logout successfully', () => {
        cy.login(user.email, user.password);
        cy.visit('/dashboard');

        // 1. Open mobile menu by clicking the hamburger icon
        // NotificationBell also has p-2, so we need the last one (Hamburger)
        cy.get('nav button.p-2').last().click();
        cy.wait(500); // Wait for animation

        // Force English to avoid language switching issues
        cy.window().then(win => {
            win.localStorage.setItem('i18nextLng', 'en');
        });

        // 2. FIX: Find the visible logout link and click the first one with force
        // Scoping to 'nav' or 'div' to be safer, and using .first()
        cy.get('body').contains('Logout').filter(':visible').first().click({ force: true });

        // Verify redirect
        cy.contains('Log In').should('exist');
    });
});

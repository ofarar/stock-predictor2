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
        cy.get('[data-testid="mobile-menu-button"]').click();
        cy.wait(500); // Wait for animation

        // Force English to avoid language switching issues
        cy.window().then(win => {
            win.localStorage.setItem('i18nextLng', 'en');
        });

        // 2. Click the logout button using data-testid
        cy.get('[data-testid="mobile-logout-button"]').click();

        // Verify redirect
        cy.contains('Log In').should('exist');
    });
});

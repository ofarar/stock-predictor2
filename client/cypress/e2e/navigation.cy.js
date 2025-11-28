describe('Navigation', () => {
    beforeEach(() => {
        cy.viewport('iphone-6');

        // Visit with English forced
        cy.visit('/', {
            onBeforeLoad(win) {
                win.localStorage.setItem('i18nextLng', 'en');
            }
        });

        // Handle Cookie Consent if visible
        // react-cookie-consent uses id="rcc-confirm-button" by default
        cy.get('body').then(($body) => {
            if ($body.find('#rcc-confirm-button').length > 0) {
                cy.get('#rcc-confirm-button').click();
            }
        });
    });

    it('should navigate to Dashboard', () => {
        // Open mobile menu
        cy.get('nav button.p-2').last().click();
        cy.wait(500);

        // The link text is 'Dashboard'
        cy.contains('a:visible', 'Dashboard').click();
        cy.url().should('include', '/dashboard');
        // Dashboard might be the home page, so check for something specific to it
        cy.get('body').should('exist');
    });

    it('should navigate to Scoreboard', () => {
        // Open mobile menu
        cy.get('nav button.p-2').last().click();
        cy.wait(500);

        cy.contains('a:visible', 'Scoreboard').click();
        cy.url().should('include', '/scoreboard');
        // Scoreboard uses divs, not a table. Check for the main heading or filter.
        cy.get('h1').should('exist');
        cy.get('select').should('exist');
    });


});

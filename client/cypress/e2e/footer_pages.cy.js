describe('Footer and Legal Pages', () => {
    beforeEach(() => {
        cy.visit('/');
        // Handle Cookie Consent if visible (standard practice in this project)
        cy.get('body').then(($body) => {
            if ($body.find('#rcc-confirm-button').length > 0) {
                cy.get('#rcc-confirm-button').click();
            }
        });
        // Scroll to bottom to ensure footer is visible/interactive
        cy.scrollTo('bottom');
    });

    it('should display the footer', () => {
        cy.get('footer').should('be.visible');
        cy.get('footer').contains('stockpredictorai.com');
    });

    it('should navigate to About page', () => {
        cy.get('footer').contains('a', 'About').click();
        cy.url().should('include', '/about');
        // Verify page content (H1 or text)
        cy.get('h1').should('exist');
    });

    it('should navigate to Contact page', () => {
        cy.get('footer').contains('a', 'Contact').click();
        cy.url().should('include', '/contact');
        cy.get('h1').should('exist');
    });

    it('should navigate to Terms of Service page', () => {
        cy.get('footer').contains('a', 'Terms').click();
        cy.url().should('include', '/terms');
        // Terms page usually has a large visible header
        cy.contains('Terms', { matchCase: false }).should('exist');
    });

    it('should navigate to Privacy Policy page', () => {
        cy.get('footer').contains('a', 'Privacy').click();
        cy.url().should('include', '/privacy');
        cy.contains('Privacy', { matchCase: false }).should('exist');
    });

    it('should navigate to Whitepaper page', () => {
        cy.get('footer').contains('a', 'Whitepaper').click();
        cy.url().should('include', '/whitepaper');
        // Whitepaper page has specific content
        cy.contains('Whitepaper', { matchCase: false }).should('exist');
    });
});

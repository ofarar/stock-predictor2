describe('SEO and Routing', () => {
    const SITE_URL = 'http://localhost:5173'; // Assuming default Vite port, adjust if needed

    it('Redirects /explore to / to avoid duplicate content', () => {
        cy.visit(`${SITE_URL}/explore`);

        // Should be redirected to home
        cy.url().should('eq', `${SITE_URL}/`);

        // Check for home page specific element
        // "Explore Predictions" is the title of the ExplorePage rendered at /
        cy.contains('Explore Predictions').should('be.visible');
    });

    it('Shows custom 404 page for non-existent routes', () => {
        const randomRoute = `/non-existent-page-${Math.floor(Math.random() * 1000)}`;
        cy.visit(`${SITE_URL}${randomRoute}`);

        // Should show 404 content
        cy.get('h1').should('contain', '404');
        cy.contains('Page Not Found').should('be.visible'); // from translations

        // "Back to Home" button should work
        cy.contains('Back to Home').click();
        cy.url().should('eq', `${SITE_URL}/`);
    });

    it('Still loads other pages correctly', () => {
        cy.visit(`${SITE_URL}/about`);
        cy.url().should('include', '/about');
        cy.contains('About StockPredictorAI').should('be.visible');
    });
});

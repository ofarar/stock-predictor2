describe('Stock Page', () => {
    const stockSymbol = 'TSLA';

    beforeEach(() => {
        cy.visit(`/stock/${stockSymbol}`);
    });

    it('should load stock data', () => {
        // Wait for loading to finish
        cy.contains('Loading...').should('not.exist');

        // Check title (might be Company Name, so we check existence)
        cy.get('h1').should('exist');
        // Check ticker in subtitle
        cy.contains(`(${stockSymbol})`).should('exist');

        // Check price (it's in a p tag with text-3xl)
        cy.get('p.text-3xl').should('exist');

        // Check chart placeholder or button
        // The chart is lazy loaded, so we check for the button to load it
        cy.get('button').contains('Load Chart').should('exist');
    });

    it('should show interaction elements', () => {
        // Check for Predict button (Text is "Make a Prediction")
        cy.contains('Make a Prediction').should('exist');

        // Check for Watchlist button (Uses title attribute, not aria-label)
        // Note: User must be logged in for this to be enabled/visible in some logic, 
        // but the button renders disabled if not logged in.
        // The test doesn't login in beforeEach, so we might need to login or just check existence.
        // The button exists but might be disabled.
        cy.get('button[title="Add to Watchlist"]').should('exist');
    });
});

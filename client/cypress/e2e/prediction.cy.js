describe('Prediction Flows', () => {
    const user = Cypress.env('testUser1');
    const stockSymbol = 'AAPL';

    const deletePrediction = () => {
        // Use the dev endpoint to delete the prediction
        cy.request({
            method: 'DELETE',
            url: `${Cypress.config('baseUrl').replace('5173', '5001')}/api/dev/predictions`,
            body: { stockTicker: stockSymbol },
            failOnStatusCode: false
        });
    };

    beforeEach(() => {
        cy.viewport('iphone-6');

        // Visit with English forced
        cy.visit('/', {
            onBeforeLoad(win) {
                win.localStorage.setItem('i18nextLng', 'en');
            }
        });

        // Handle Cookie Consent if visible
        cy.get('body').then(($body) => {
            if ($body.find('#rcc-confirm-button').length > 0) {
                cy.get('#rcc-confirm-button').click();
            }
        });

        cy.login(user.email, user.password);

        // Clean up any existing prediction for AAPL before starting
        deletePrediction();

        cy.visit('/dashboard');
    });

    afterEach(() => {
        // Clean up after test
        deletePrediction();
    });

    it('should open prediction modal and search for a stock', () => {
        // Verify user is logged in by checking for Notification Bell
        cy.get('nav').find('svg').should('exist');

        cy.wait(2000);

        // Click on "Make Prediction" button
        cy.get('button[title="Make a Prediction"]').should('be.visible').click({ force: true });

        // Verify modal opens
        cy.get('#prediction-modal').should('be.visible');

        // Search for stock
        cy.wait(500);
        cy.get('#prediction-modal input[type="text"]').should('be.visible').clear({ force: true }).type(stockSymbol, { force: true });
        cy.wait(1000);

        // Select stock from results
        cy.get('#prediction-modal').contains(stockSymbol).click({ force: true });

        // Verify stock is selected in modal
        cy.get('#prediction-modal').should('contain', stockSymbol);
    });

    it('should submit a prediction and verify in profile and explore', () => {
        // 1. Submit Prediction
        cy.wait(2000);
        cy.get('button[title="Make a Prediction"]').should('be.visible').click({ force: true });
        cy.get('#prediction-modal').should('be.visible');

        cy.wait(500);
        cy.get('#prediction-modal input[type="text"]').should('be.visible').clear({ force: true }).type(stockSymbol, { force: true });
        cy.wait(1000);
        cy.get('#prediction-modal').contains(stockSymbol).click({ force: true });

        cy.wait(2000);
        cy.get('#prediction-modal select').select('Weekly');
        cy.get('#prediction-modal').contains('Place Prediction').click({ force: true });

        cy.get('body').should('contain', `Prediction for ${stockSymbol} submitted!`);

        // 2. Verify in Profile -> Active Predictions
        cy.wait(1000);
        cy.get('nav button.p-2').last().click(); // Mobile menu
        cy.wait(500);
        cy.contains('My Profile').click({ force: true });

        // Ensure we are on the profile page
        // The username might be split in the UI, so we check for the h1 that contains it
        cy.get('h1').should('contain', 'Stock Predictor');

        // Click "Active" tab if needed (it's usually default, but good to be explicit if tabs exist)
        // Based on translation.json: "profile_active_predictions": "Active Predictions"
        cy.contains('Active Predictions').should('exist');

        // Check for the prediction card
        cy.contains(stockSymbol).should('exist');
        cy.contains('Weekly').should('exist');

        // 3. Verify in Home Page (Landing Page / Explore Feed)
        // The user refers to this as the "Home Page" and it contains the feed.
        // We visit the root URL directly.
        cy.visit('/');

        // Wait for feed to load
        cy.wait(2000);

        // Check for the prediction card in the feed
        // We might need to scroll or filter, but let's check if it's in the "Community Feed" or similar
        // The dashboard usually has a "Community Feed" or "Following Feed"
        // Let's check for the stock symbol in the body, assuming it appears in a feed card
        cy.contains(stockSymbol).should('exist');
    });
});

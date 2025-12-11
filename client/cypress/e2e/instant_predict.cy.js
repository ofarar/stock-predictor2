describe('Instant Predict (Gold Bot) E2E', () => {
    beforeEach(() => {
        // 1. Mock Admin User Login
        cy.intercept('GET', '/api/auth/me', {
            statusCode: 200,
            body: {
                _id: 'admin_user_id',
                username: 'AdminUser',
                email: 'ofarar@gmail.com', // Recognized super-admin
                isAdmin: true,
                canUseGoldBot: true,
                avatar: 'https://robohash.org/admin'
            }
        }).as('getMe');

        // 2. Visit Profile Page
        cy.visit('/profile');
        cy.wait('@getMe');
    });

    it('should display the Instant Predict button for admins', () => {
        cy.contains('button', 'Instant Predict').should('be.visible');
    });

    it('should run a successful prediction (Happy Path)', () => {
        // Mock the backend prediction response
        cy.intercept('POST', '/api/admin/predict-gold', {
            statusCode: 200,
            body: {
                ticker: 'AAPL',
                current_price: 150.00,
                prediction: 'Bullish',
                target_price: 155.00,
                pct_move: 0.0333,
                rationale: 'Mocked Rationale for Test',
                timeframe: 'Short Term (4H)',
                interval: '1h'
            }
        }).as('predictSuccess');

        // Mock Autocomplete
        cy.intercept('GET', '/api/search/AAPL', {
            statusCode: 200,
            body: { quotes: [{ symbol: 'AAPL', shortname: 'Apple Inc.' }] }
        }).as('searchStock');

        // Interaction
        cy.contains('button', 'Instant Predict').click();
        cy.get('input[placeholder="e.g. AAPL, BTC-USD, GLD"]').type('AAPL');
        cy.wait('@searchStock');
        cy.contains('li', 'AAPL').click();

        cy.contains('button', 'Run Analysis').click();

        cy.wait('@predictSuccess');

        // Assert Result View
        cy.contains('h2', 'AAPL').should('be.visible');
        cy.contains('Bullish').should('be.visible');
        cy.contains('Expected Move: +3.33%').should('be.visible');
    });

    it('should handle Rate Limit error (Cannot use 2 times per hour)', () => {
        // Mock the backend 429 response
        cy.intercept('POST', '/api/admin/predict-gold', {
            statusCode: 429,
            body: {
                message: 'Rate limit exceeded. Try again in 59 minutes.'
            }
        }).as('predictRateLimit');

        // Interaction
        cy.contains('button', 'Instant Predict').click();
        cy.get('input[placeholder="e.g. AAPL, BTC-USD, GLD"]').type('AAPL');
        // Just click run (assuming typed manually or stubbed select)
        cy.contains('button', 'Run Analysis').click();

        cy.wait('@predictRateLimit');

        // Assert Toast Error
        // React Hot Toast usually puts message in a div[role="status"] or similar
        cy.contains('Rate limit exceeded').should('be.visible');
    });
});

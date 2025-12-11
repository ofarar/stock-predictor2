describe('Instant Predict (Gold Bot) E2E', () => {
    const adminUser = {
        _id: 'admin_user_id',
        username: 'AdminUser',
        email: 'ofarar@gmail.com',
        isAdmin: true,
        canUseGoldBot: true,
        avatar: 'https://robohash.org/admin',
        isBot: false,
        isGoldenMember: false,
        isVerified: true,
        watchlist: [],
        badges: [],
        followers: [],
        following: [],
        goldenSubscriptions: [],
        bio: 'Admin Test Bio',
        createdAt: new Date().toISOString()
    };

    beforeEach(() => {
        cy.on('uncaught:exception', () => false); // Ignore ResizeObserver loop errors

        // 1. Mock Admin User Session
        cy.intercept('GET', '**/auth/current_user', {
            statusCode: 200,
            body: adminUser
        }).as('getMe');

        // 2. Mock Settings (Prevent loading hang)
        cy.intercept('GET', '**/api/settings', {
            statusCode: 200,
            body: {
                isEarningsBannerActive: false,
                verificationPrice: 4.99,
                isPromoBannerActive: false
            }
        }).as('getSettings');

        // 3. Mock Notifications (Prevent 401 errors)
        cy.intercept('GET', '**/api/notifications', {
            statusCode: 200,
            body: []
        }).as('getNotifications');

        // 4. Mock View Log (Prevent 404/Error on side effect)
        cy.intercept('POST', '**/api/users/*/view', {
            statusCode: 200,
            body: { success: true }
        }).as('postView');

        // 5. Mock Profile Data (The Page Data)
        cy.intercept('GET', `**/api/profile/${adminUser._id}`, {
            statusCode: 200,
            body: {
                user: adminUser,
                predictions: [],
                performance: {
                    totalRating: 0,
                    overallRank: 999,
                    overallAvgRating: 50.0
                },
                followersCount: 10,
                followingCount: 5,
                goldenSubscribersCount: 0,
                goldenSubscriptionsCount: 0,
                isFollowing: false,
                isSubscribed: false
            }
        }).as('getProfile');

        // 6. Visit Profile Page with Language forced to EN
        cy.visit(`/profile/${adminUser._id}`, {
            onBeforeLoad(win) {
                win.localStorage.setItem('i18nextLng', 'en');
            }
        });
        cy.wait('@getProfile');
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

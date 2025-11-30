describe('Documentation Screenshots', () => {
    const email = 'ofarar@gmail.com';
    const password = 'a63R34a41R.*.*';

    beforeEach(() => {
        cy.viewport(1200, 900);
        // Prevent test from failing on application errors
        cy.on('uncaught:exception', (err, runnable) => {
            return false;
        });

        // Hide toasts to prevent them from appearing in screenshots
        const style = document.createElement('style');
        style.innerHTML = `
          div[role="status"] { display: none !important; opacity: 0 !important; visibility: hidden !important; }
        `;
        document.head.appendChild(style);
    });

    it('captures screenshots for the ad document', () => {
        // 1. Login
        cy.login(email, password);

        // Mock Followers/Following to prevent "Load Error" toasts
        cy.intercept('GET', '**/api/users/*/followers*', { statusCode: 200, body: { users: [], total: 0 } }).as('mockFollowers');
        cy.intercept('GET', '**/api/users/*/following*', { statusCode: 200, body: { users: [], total: 0 } }).as('mockFollowing');

        // 2. Homepage
        cy.visit('/');
        // Unconditional wait for cookie banner and force click
        cy.wait(1000);
        cy.get('body').then(($body) => {
            if ($body.find('button:contains("Accept")').length > 0) {
                cy.contains('button', 'Accept').click({ force: true });
            }
        });
        cy.wait(2000);
        cy.screenshot('01_homepage', { capture: 'viewport' });

        // Mock Explore Feed to ensure data
        cy.intercept('GET', '**/api/explore/feed*', {
            statusCode: 200,
            body: {
                predictions: [
                    {
                        _id: 'p1',
                        userId: { _id: 'u1', username: 'Analyst1', avatar: '', isGoldenMember: false, avgRating: 75 },
                        stockTicker: 'AAPL',
                        targetPrice: 180.50,
                        currentPrice: 175.00,
                        deadline: new Date(Date.now() + 86400000).toISOString(),
                        predictionType: 'Daily',
                        status: 'Active',
                        likes: [],
                        dislikes: []
                    },
                    {
                        _id: 'p2',
                        userId: { _id: 'u2', username: 'Analyst2', avatar: '', isGoldenMember: true, avgRating: 92 },
                        stockTicker: 'TSLA',
                        targetPrice: 250.00,
                        currentPrice: 240.00,
                        deadline: new Date(Date.now() + 86400000).toISOString(),
                        predictionType: 'Daily',
                        status: 'Active',
                        likes: [],
                        dislikes: []
                    }
                ],
                totalPages: 1
            }
        }).as('mockExploreFeed');

        // 3. Community Feed (Home Page - Active Tab)
        cy.visit('/?status=Active');
        cy.wait('@mockExploreFeed');

        // Wait for the mocked content to appear
        cy.contains('Analyst1', { timeout: 10000 }).should('be.visible');

        // Scroll to the feed
        cy.contains('Analyst1').scrollIntoView({ block: 'center', inline: 'center' });
        cy.wait(2000);
        cy.screenshot('02_community_feed', { capture: 'viewport' });

        // 4. Prediction Cards (Dashboard)
        cy.visit('/dashboard');
        cy.wait(3000);
        cy.contains("Last Hour's Winners").scrollIntoView({ block: 'center', inline: 'center' });
        cy.wait(1000);
        cy.screenshot('03_prediction_cards_dashboard', { capture: 'viewport' });

        // 5. Scoreboard
        cy.visit('/scoreboard');
        cy.wait(3000);
        cy.screenshot('04_scoreboard', { capture: 'viewport' });

        // 6. Profile Page Overview
        // Force click in case of overlays
        cy.get('nav button svg path[d^="M4 6h16"]').closest('button').click({ force: true });
        cy.wait(500);
        cy.contains('a', 'My Profile').click({ force: true });
        cy.wait(3000);
        cy.screenshot('05_profile_overview', { capture: 'viewport' });

        cy.url().then(url => {
            const userId = url.split('/').pop();
            cy.wrap(userId).as('userId');
        });

        // 7. Profile Tabs
        cy.contains('Active Predictions').scrollIntoView({ block: 'center', inline: 'center' });
        cy.wait(1000);
        cy.screenshot('06_profile_active_predictions', { capture: 'viewport' });

        cy.contains('Prediction History').scrollIntoView({ block: 'center', inline: 'center' });
        cy.wait(1000);
        cy.screenshot('07_profile_history', { capture: 'viewport' });

        cy.get('nav').scrollIntoView();
        cy.contains('Followers').click();
        cy.wait(3000);
        cy.screenshot('08_profile_followers', { capture: 'viewport' });
        cy.go('back');
        cy.wait(2000);

        // 8. Watchlist
        cy.visit('/watchlist');
        cy.wait(3000);
        cy.screenshot('20_watchlist', { capture: 'viewport' });

        // 9. Creator Pool
        cy.get('@userId').then(userId => {
            cy.visit(`/profile/${userId}`);
        });
        cy.wait(2000);
        cy.contains('Creator Pool Share').click();
        cy.wait(2000);
        cy.screenshot('09_creator_pool_modal', { capture: 'viewport' });

        cy.get('[data-testid="creator-pool-modal"]').then(($modal) => {
            const userButtons = $modal.find('button:has(img)');
            if (userButtons.length > 0) {
                cy.wrap(userButtons.first()).click();
                cy.wait(1000);
                cy.screenshot('10_creator_pool_detail', { capture: 'viewport' });
                // Close detail modal with ESC
                cy.get('body').type('{esc}');
                cy.wait(500);
            }
        });
        // Force close main modal with ESC
        cy.get('body').type('{esc}');
        cy.wait(500);

        // 10. Golden Membership Modal
        cy.get('body').then(($body) => {
            if ($body.find('button:contains("Become Golden")').length > 0) {
                cy.contains('button', 'Become Golden').click({ force: true });
                cy.wait(1000);
                cy.screenshot('11_golden_membership_modal', { capture: 'viewport' });
                cy.get('body').type('{esc}');
            } else if ($body.find('button:contains("Manage Golden")').length > 0) {
                cy.contains('button', 'Manage Golden').click({ force: true });
                cy.wait(1000);
                cy.screenshot('11_golden_membership_manage', { capture: 'viewport' });
                cy.get('body').type('{esc}');
            }
        });
        cy.wait(1000);

        // 11. Golden Post Creation
        const mockGoldenUserId = '507f1f77bcf86cd799439011';

        // Mock Search - StockFilterSearch expects { quotes: [...] }
        cy.intercept('GET', '**/api/search/AAPL', {
            statusCode: 200,
            body: { quotes: [{ symbol: 'AAPL', shortname: 'Apple Inc.' }] }
        }).as('mockSearch');

        // Mock Quote - GoldenPostForm expects { symbol, regularMarketPrice }
        cy.intercept('GET', '**/api/quote/AAPL', {
            statusCode: 200,
            body: { symbol: 'AAPL', regularMarketPrice: 180.50 }
        }).as('mockQuote');

        cy.intercept('GET', '**/auth/current_user', {
            statusCode: 200,
            body: {
                _id: mockGoldenUserId,
                username: 'GoldenUser',
                email: 'golden@example.com',
                avatar: 'https://avatar.iran.liara.run/public/boy?username=GoldenUser',
                isGoldenMember: true,
                language: 'en',
                isAdmin: false,
                isVerified: true
            }
        }).as('getCurrentUserGolden');

        cy.visit('/golden-feed');
        cy.contains('h1', 'Your Golden Feed').should('be.visible');
        cy.wait(1000);

        // Click "Create Post"
        cy.get('h1.text-3xl button').should('be.visible').click();
        cy.wait(500);

        // Fill message
        cy.get('textarea[placeholder*="Share your exclusive"]')
            .should('be.visible')
            .type('My exclusive signal: I expect $AAPL to break resistance next week.', { force: true });

        // Check "Attach a Prediction"
        cy.get('#attachPrediction').check({ force: true });
        cy.wait(750);

        // Search for Stock
        cy.get('form input[placeholder*="e.g., AAPL"]')
            .should('be.visible')
            .click({ force: true })
            .type('AAPL', { force: true });

        // Wait for search results
        cy.wait('@mockSearch', { timeout: 8000 });
        cy.get('ul.absolute').should('be.visible'); // Wait for dropdown

        // Select AAPL
        cy.contains('li', 'AAPL').should('be.visible').click({ force: true });
        cy.wait('@mockQuote');

        // Set Target Price
        cy.contains('label', 'Target Price')
            .closest('div')
            .find('input[type="number"]')
            .clear()
            .type('195.00', { force: true });

        // Capture Screenshot
        cy.get('div.max-w-lg')
            .first()
            .scrollIntoView({ duration: 500 })
            .screenshot('11_golden_post_modal_filled', { capture: 'viewport' });

        // Close modal
        cy.contains('button', 'Cancel').click();


        // 12. AI Wizard
        cy.visit('/ai-wizard');
        cy.wait(3000);
        cy.screenshot('12_ai_wizard', { capture: 'viewport' });

        // 13. Stock Page
        cy.visit('/stock/AAPL');
        cy.wait(5000);
        cy.screenshot('13_stock_page_aapl', { capture: 'viewport' });

        // 14. Recommended Users
        cy.contains('Top Predictors').scrollIntoView({ block: 'center', inline: 'center' });
        cy.wait(1000);
        cy.screenshot('14_stock_page_top_predictors', { capture: 'viewport' });

        // 15. Make Prediction
        cy.get('[data-testid="watchlist-button"]').next('button').click({ force: true });
        cy.wait(2000);
        cy.get('input[type="number"]').then(($input) => {
            const val = parseFloat($input.val()) || 250.00;
            cy.wrap($input).clear().type((val * 1.08).toFixed(2));
        });
        cy.get('textarea').type('Strong momentum.');
        cy.wait(1000);
        cy.screenshot('16_prediction_modal_filled', { capture: 'viewport' });
        cy.contains('button', 'Place Prediction').click({ force: true });
        cy.wait(3000);

        cy.reload();
        cy.wait(5000);
        cy.contains('Active Predictions').parent().find('a').first().click();
        cy.wait(3000);
        cy.scrollTo('top');
        cy.wait(1000);
        cy.screenshot('17_prediction_detail', { capture: 'viewport' });

        // 16. Subscription Wizard
        cy.intercept('GET', '**/auth/current_user', {
            statusCode: 200,
            body: {
                _id: mockGoldenUserId,
                username: 'GoldenUser',
                email: 'golden@example.com',
                avatar: 'https://avatar.iran.liara.run/public/boy?username=GoldenUser',
                isGoldenMember: true,
                language: 'en',
                isAdmin: false,
                isVerified: true
            }
        }).as('forceGoldenWizard');

        cy.intercept('POST', '**/api/golden-members/recommend', [
            { _id: 'm1', username: 'G1', isGoldenMember: true, matchPercentage: 95, followers: [], avgRating: 85, avatar: 'https://avatar.iran.liara.run/public/boy?username=G1' },
            { _id: 'm2', username: 'G2', isGoldenMember: true, matchPercentage: 88, followers: [], avgRating: 80, avatar: 'https://avatar.iran.liara.run/public/girl?username=G2' },
            { _id: 'm3', username: 'G3', isGoldenMember: true, matchPercentage: 75, followers: [], avgRating: 70, avatar: 'https://avatar.iran.liara.run/public/boy?username=G3' }
        ]).as('mockWizard');

        cy.intercept('GET', '**/api/users/*/follow-data-extended', {
            statusCode: 200,
            body: {
                followers: [
                    { _id: 'u1', username: 'TraderJoe', isGoldenMember: false, avatar: 'https://avatar.iran.liara.run/public/boy?username=TraderJoe', followers: [], following: [] },
                    { _id: 'u2', username: 'AliceWonder', isGoldenMember: true, avatar: 'https://avatar.iran.liara.run/public/girl?username=AliceWonder', followers: [], following: [] },
                    { _id: 'u3', username: 'BobBuilder', isGoldenMember: false, avatar: 'https://avatar.iran.liara.run/public/boy?username=BobBuilder', followers: [], following: [] }
                ],
                following: [
                    { _id: 'u4', username: 'ElonMusk', isGoldenMember: true, avatar: 'https://avatar.iran.liara.run/public/boy?username=ElonMusk', followers: [], following: [] },
                    { _id: 'u5', username: 'CathieWood', isGoldenMember: true, avatar: 'https://avatar.iran.liara.run/public/girl?username=CathieWood', followers: [], following: [] }
                ],
                goldenSubscribers: [],
                goldenSubscriptions: [],
                profileUser: {
                    _id: mockGoldenUserId,
                    username: 'GoldenUser',
                    isGoldenMember: true
                }
            }
        }).as('mockFollowDataExtended');

        cy.visit(`/profile/${mockGoldenUserId}/followers`);
        cy.wait('@forceGoldenWizard');
        cy.wait(2000);
        cy.contains('button', 'Subscriptions').click();
        cy.wait(1000);
        cy.contains('button', 'Start the Wizard').scrollIntoView({ block: 'center' });
        cy.wait(1000);
        cy.screenshot('18_subscription_wizard_start', { capture: 'viewport' });

        cy.contains('button', 'Start the Wizard').click();
        cy.wait(1000);
        cy.contains('button', 'Skip').click();
        cy.wait(500);
        cy.contains('button', 'Neutral').click();
        cy.contains('button', 'Next').click();
        cy.wait(500);
        cy.contains('button', 'All Horizons').click();
        cy.contains('button', 'Find Recommendations').click();
        cy.wait(12000); // Increased wait for avatars
        cy.screenshot('19_subscription_wizard_results', { capture: 'viewport' });
        // Close wizard modal with ESC
        cy.get('body').type('{esc}');
        cy.wait(1000);

        // 17. Notifications
        cy.get('nav button svg path[d^="M15 17"]').closest('button').filter(':visible').click({ force: true });
        cy.wait(1000);
        cy.screenshot('21_notifications', { capture: 'viewport' });
    });
});

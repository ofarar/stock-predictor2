
describe('Profile Page', () => {
    // Valid 24-char Hex ID for testing (will be overwritten by real DB ID)
    let testUserId;
    const testUser = {
        email: 'profiletest@example.com',
        username: 'ProfileTestUser',
        password: 'password123',
        googleId: 'profile_test_id'
    };

    before(() => {
        // 1. Create a REAL user in the DB so login works
        cy.request('POST', 'http://localhost:5001/api/dev/setup-test-users', {
            users: [testUser]
        }).then((resp) => {
            const users = resp.body;
            // Get the ID assigned by the real database
            testUserId = users.find(u => u.email === testUser.email)._id;
        });
    });

    beforeEach(() => {
        cy.on('uncaught:exception', (err, runnable) => {
            // recurring error: "ResizeObserver loop limit exceeded" or similar
            return false;
        });

        // 2. Login as the test user (now exists in DB)
        cy.login(testUser.email, testUser.password);

        // Mock Settings to prevent App.jsx timeout (kept from original)
        cy.intercept('GET', '**/api/settings', {
            statusCode: 200,
            body: {
                isEarningsBannerActive: false,
                verificationPrice: 4.99,
                isPromoBannerActive: false
            }
        }).as('getSettings');

        // Mock Current User (Guest or Logged In)
        cy.intercept('GET', '**/api/current-user', {
            statusCode: 200,
            body: {
                _id: testUserId,
                username: testUser.username,
                role: 'user',
                isGoldenMember: false,
                followers: [],
                following: [],
                goldenSubscriptions: []
            }
        }).as('getCurrentUser');

        // 3. Mock the Profile Data Response to inject Performance Stats
        // We use the real ID in the URL pattern
        cy.intercept('GET', `**/api/profile/${testUserId}`, {
            statusCode: 200,
            body: {
                totalAnalystRating: 450,
                followersCount: 0,
                followingCount: 0,
                goldenSubscribersCount: 0,
                goldenSubscriptionsCount: 0,
                user: {
                    _id: testUserId,
                    username: testUser.username,
                    role: 'user',
                    createdAt: new Date().toISOString(),
                    isVerified: false,
                    isGoldenMember: false,
                    avatar: null,
                    totalAnalystRating: 450,
                    analystRating: { total: 450, count: 10 },
                    badges: [],
                    followers: [],
                    following: [],
                    watchlist: []
                },
                performance: {
                    overallAvgRating: 85.5,
                    overallRank: 5,
                    totalPredictions: 20,
                    aggressiveness: {
                        distribution: { defensive: 5, neutral: 10, offensive: 5 },
                        analyzedCount: 20
                    },
                    byType: [
                        { type: 'Weekly', avgRating: 90.0, rank: 2, aggressivenessScore: 60 }
                    ],
                    byStock: [
                        { ticker: 'AAPL', avgRating: 88.5, rank: 1, aggressivenessScore: 70 }
                    ]
                },
                predictions: [
                    {
                        _id: 'p1',
                        stockTicker: 'AAPL',
                        predictionType: 'Weekly',
                        status: 'Assessed',
                        priceAtCreation: 100,
                        targetPrice: 110,
                        actualPrice: 108,
                        rating: 85.0,
                        avgRating: 4.5,
                        userId: { _id: testUserId, username: testUser.username },
                        createdAt: new Date().toISOString()
                    },
                    {
                        _id: 'p2',
                        stockTicker: 'AAPL',
                        predictionType: 'Weekly',
                        status: 'Assessed',
                        priceAtCreation: 100,
                        targetPrice: 90,
                        actualPrice: 110,
                        rating: 40.0,
                        avgRating: 2.0,
                        userId: { _id: testUserId, username: testUser.username },
                        createdAt: new Date().toISOString()
                    }
                ],
                chartData: []
            }
        }).as('getUserProfile');

        // 4. Visit the profile page using the REAL ID
        cy.visit(`/profile/${testUserId}`);

        // Wait for the mock to be hit
        cy.wait('@getUserProfile');
    });

    it('displays profile header stats correctly', () => {
        // Check Stat Cards presence
        cy.contains('Overall Rank');
        cy.contains('#5');
        cy.contains('Average Rating');
        cy.contains('85.5');
        cy.contains('Analyst Rating');
        cy.contains('450');

        // Check Progress Bars exist
        cy.contains('Prediction Style');
        cy.contains('Direction Accuracy');

        // Interaction: Click Header Bar (Direction Accuracy)
        // Find the container that has 'Direction Accuracy' text
        cy.contains('div', 'Direction Accuracy').click();

        // Percentages should be visible after click (if not already)
        cy.contains('50.0%').should('exist');
    });

    it('displays performance tabs and opens detail modal on click', () => {
        // Check Tabs
        cy.contains('By Type').should('exist');
        cy.contains('By Stock').scrollIntoView().should('be.visible');

        // Check Card Content (By Type - Weekly)
        cy.contains('Weekly').should('exist');
        // We look for #2 specifically in the context of the rank card, 
        // but simple contains should suffice for availability check
        cy.contains('#2');

        // CLICK CARD (Weekly)
        cy.contains('Weekly').click({ force: true });

        // VALIDATE MODAL OPEN
        cy.contains('Performance Details', { timeout: 10000 }).should('be.visible');
        cy.contains('Weekly').should('be.visible');

        // VALIDATE MODAL CONTENT
        cy.get('div[role="dialog"]').within(() => {
            cy.contains('50.0%').should('be.visible');
            cy.contains('1/2 Correct').should('be.visible');
            cy.contains('#2').should('be.visible');
        });

        // CLOSE MODAL
        cy.contains('Close').click({ force: true });
        cy.contains('Performance Details').should('not.exist');
    });

    it('switches tabs and opens modal for stock', () => {
        cy.contains('By Stock').click();

        // Check Card Content (AAPL) and ensure we target the StatCard (not PredictionList)
        // StatCard contains "Average Rating"
        cy.contains('.bg-gray-700', 'AAPL')
            .filter(':contains("Average Rating")')
            .click({ force: true });

        // VALIDATE MODAL
        cy.get('div[role="dialog"]').should('be.visible');
        cy.get('div[role="dialog"]').contains('AAPL');

        // Stats in modal include Direction Accuracy
        cy.get('div[role="dialog"]').contains('50.0%');
    });
});


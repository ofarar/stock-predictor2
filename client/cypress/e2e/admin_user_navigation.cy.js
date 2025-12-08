describe('Admin User Navigation', () => {
    const adminUser = {
        _id: 'admin123',
        username: 'AdminUser',
        email: 'admin@example.com',
        isAdmin: true,
        isGoldenMember: false,
        following: [],
        goldenSubscriptions: [],
        goldenSubscribers: []
    };

    const targetUser = {
        _id: '507f1f77bcf86cd799439011',
        username: 'Trader1',
        email: 't1@test.com',
        isAdmin: false,
        isBot: false,
        createdAt: new Date().toISOString(),
        predictionCount: 5,
        avgRating: 4.5,
        followersCount: 10
    };

    const mockSettings = {
        isVerificationEnabled: true,
        verificationPrice: 4.99,
        isAIWizardEnabled: true,
        isFinanceApiEnabled: true,
        isPromoBannerActive: false,
        isEarningsBannerActive: false
    };

    const targetUserProfile = {
        totalAnalystRating: 100,
        followersCount: 10,
        followingCount: 5,
        goldenSubscribersCount: 0,
        goldenSubscriptionsCount: 0,
        user: {
            ...targetUser,
            role: 'user',
            isVerified: false,
            isGoldenMember: false,
            avatar: null,
            totalAnalystRating: 100,
            analystRating: { total: 100, count: 2 },
            badges: [],
            followers: [],
            following: [],
            watchlist: []
        },
        performance: {
            overallAvgRating: 4.5,
            overallRank: 10,
            totalPredictions: 5,
            aggressiveness: { analyzedCount: 5, distribution: { defensive: 2, neutral: 2, offensive: 1 } },
            byType: [
                { type: 'Weekly', avgRating: 90.0, rank: 2, aggressivenessScore: 60 }
            ],
            byStock: [
                { ticker: 'AAPL', avgRating: 88.5, rank: 1, aggressivenessScore: 70 }
            ]
        },
        predictions: [],
        chartData: []
    };

    beforeEach(() => {
        // 1. Mock Admin Identity
        cy.intercept('GET', '**/auth/current_user', {
            statusCode: 200,
            body: adminUser
        }).as('getCurrentUser');

        // 2. Mock Settings
        cy.intercept('GET', '**/api/settings', {
            statusCode: 200,
            body: mockSettings
        }).as('getSettings');

        // 3. Mock User List (The data needed for AdminUserList)
        cy.intercept('GET', '**/api/admin/all-users*', {
            statusCode: 200,
            body: [targetUser]
        }).as('getUsers');

        // 4. Mock Pending Predictions (to prevent dashboard errors if it fetches this)
        cy.intercept('GET', '**/api/admin/predictions/pending', {
            statusCode: 200,
            body: []
        }).as('getPending');

        // 5. Mock Waitlist (to prevent dashboard errors)
        cy.intercept('GET', '**/api/admin/ai-wizard-waitlist', {
            statusCode: 200,
            body: []
        }).as('getWaitlist');

        // 6. Mock Target User Profile (When navigating)
        cy.intercept('GET', `**/api/profile/${targetUser._id}`, {
            statusCode: 200,
            body: targetUserProfile
        }).as('getUserProfile');
    });

    it('should navigate to user profile when clicking on a user in the list', () => {
        cy.visit('/admin');
        cy.wait('@getSettings');
        cy.wait('@getUsers');

        // Ensure we are on the Users tab (it's the default usually, but good to be safe)
        // If "Users" is not the default, we might need to click it. 
        // Based on previous file analysis, "Users" seemed to be the default or easily accessible.
        // Let's assert the user is visible.
        cy.contains(targetUser.username).should('be.visible');

        // Click on the user's name or card
        // The AdminUserList component wraps the name in a Link
        cy.contains('a', targetUser.username).click();

        // Verify URL
        cy.url().should('include', `/profile/${targetUser._id}`);

        // Verify Profile Page Loaded (Mocked Profile Data)
        cy.wait('@getUserProfile');
        cy.contains('h1', targetUser.username).should('be.visible'); // Assuming Profile page has h1 with username
        cy.contains('Overall Rank').should('be.visible'); // Standard profile element
    });
});

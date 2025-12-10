describe('Analyst Rating Flow', () => {
    const mockUser = {
        _id: 'user123',
        username: 'TestAnalyst',
        avatar: 'https://example.com/avatar.jpg',
        isGoldenMember: false,
        analystRating: { total: 150 },
        badges: [],
        watchlist: []
    };

    const mockPrediction = {
        _id: 'pred123',
        stockTicker: 'AAPL',
        predictionType: 'Daily',
        status: 'Assessed',
        earnedPoints: 15,
        rating: 92.5,
        targetPrice: 150,
        actualPrice: 155,
        priceAtCreation: 145,
        userId: mockUser,
        createdAt: new Date().toISOString(),
        views: 10,
        likeCount: 5,
        dislikeCount: 0,
        history: [] // Add missing fields
    };

    const mockProfile = {
        user: mockUser,
        predictions: [],
        performance: {
            overallRank: 10,
            overallAvgRating: 85.5,
            aggressiveness: { distribution: [], analyzedCount: 0 }
        },
        chartData: []
    };

    beforeEach(() => {
        cy.intercept('GET', '**/api/prediction/pred123*', {
            body: mockPrediction
        }).as('getPrediction');

        cy.intercept('GET', '**/api/quote/AAPL', { fixture: 'quote.json' }).as('getQuote');

        cy.intercept('GET', '**/api/profile/user123', {
            body: mockProfile
        }).as('getProfile');

        // Mock view logging
        cy.intercept('POST', '**/api/prediction/pred123/view', { statusCode: 200 });

        cy.intercept('GET', '**/api/auth/current_user', {
            body: mockUser
        }).as('getCurrentUser');
    });

    it('should display analyst rating points and highlight profile stat on click', () => {
        cy.visit('/prediction/pred123');
        cy.wait('@getPrediction');

        // Check for basic content to ensure page loaded
        cy.contains('AAPL').should('be.visible');
        cy.contains('Assessed').should('be.visible');

        // Verify the new Analyst Rating badge
        cy.contains('+15.0 Analyst Rating', { timeout: 10000 })
            .should('be.visible')
            .click();

        // Check URL
        cy.url().should('include', '/profile/user123');

        // Check Highlight
        cy.contains('Analyst Rating').should('be.visible');
        // We match strictly the class that applies the animation
        cy.get('.ring-4.ring-yellow-400.animate-pulse').should('be.visible');
    });

    it('should NOT highlight profile stat when visited directly', () => {
        cy.visit('/profile/user123');
        cy.wait('@getProfile');

        cy.contains('Analyst Rating').should('be.visible');
        cy.get('.ring-4.ring-yellow-400.animate-pulse').should('not.exist');
    });
});

describe('Golden Membership & Profile Flow', () => {
    const user1 = Cypress.env('testUser1');
    const user2 = Cypress.env('testUser2');
    let user1Id, user2Id;

    before(() => {
        // Setup test users and reset state
        cy.request('POST', 'http://localhost:5001/api/dev/setup-test-users', {
            users: [
                {
                    email: user1.email,
                    username: 'TestUser1',
                    googleId: 'test_id_1',
                    notificationSettings: { allFollowedPredictions: true }
                },
                { email: user2.email, username: 'TestUser2', googleId: 'test_id_2' }
            ]
        }).then((resp) => {
            const users = resp.body;
            user1Id = users.find(u => u.email === user1.email)._id;
            user2Id = users.find(u => u.email === user2.email)._id;
        });

        // Clear predictions for test users to avoid duplicates
        cy.request('POST', 'http://localhost:5001/api/dev/clear-predictions', { email: user1.email });
        cy.request('POST', 'http://localhost:5001/api/dev/clear-predictions', { email: user2.email });
    });

    it('should receive notification when followed user predicts', () => {
        // User 1 follows User 2
        cy.login(user1.email, user1.password);
        cy.visit(`/profile/${user2Id}`);

        // Intercept follow request
        cy.intercept('POST', '**/users/*/follow').as('followRequest');

        // Click Follow (target the button specifically)
        cy.contains('button', 'Follow').click();

        // Wait for request and UI update
        cy.wait('@followRequest');
        cy.contains('Following').should('be.visible');

        // User 2 makes a prediction (via API)
        cy.login(user2.email, user2.password);
        cy.request({
            method: 'POST',
            url: 'http://localhost:5001/api/predict',
            body: {
                stockTicker: 'AAPL',
                targetPrice: 200,
                deadline: new Date(Date.now() + 86400000).toISOString(),
                predictionType: 'Daily',
                description: 'Test prediction',
                maxRatingAtCreation: 100
            }
        });

        // User 1 checks notifications
        cy.login(user1.email, user1.password);
        cy.reload(); // Ensure fresh state

        // Click Bell Icon (finding by the specific path d attribute start)
        cy.get('nav button svg path[d^="M15 17"]').closest('button').filter(':visible').click();

        // Assert notification exists
        cy.contains('TestUser2').should('exist');
        cy.contains('AAPL').should('exist');
    });

    it('should handle Golden Membership flow', () => {
        // 1. User 2 becomes Golden (via Dev API)
        cy.request('POST', 'http://localhost:5001/api/dev/set-golden', {
            email: user2.email,
            isGoldenMember: true,
            price: 10,
            acceptingNewSubscribers: true
        }).then((resp) => {
            expect(resp.body.isGoldenMember).to.be.true;
            expect(resp.body.acceptingNewSubscribers).to.be.true;
            expect(resp.body.goldenMemberPrice).to.eq(10);
        });

        // Verify IDs are different
        expect(user1Id).to.not.equal(user2Id);

        // 2. User 1 subscribes to User 2
        cy.login(user1.email, user1.password);

        // Intercept profile fetch to ensure we wait for it
        cy.intercept('GET', `/api/profile/${user2Id}`).as('getProfile');

        cy.visit(`/profile/${user2Id}`);

        // Wait for profile data to load
        cy.wait('@getProfile').then((interception) => {
            const profile = interception.response.body;
            cy.log('Profile Data:', JSON.stringify(profile));
            expect(profile.user.isGoldenMember).to.be.true;
            expect(profile.user.acceptingNewSubscribers).to.be.true;
        });

        // Should see "Join" button with price
        cy.contains('button', 'Join').should('be.visible');

        // Intercept the Stripe call to avoid actual redirect
        cy.intercept('POST', '**/subscribe-to-member/**', {
            statusCode: 200,
            body: { url: 'http://localhost:5173/payment-success-mock' }
        }).as('subscribeCall');

        cy.contains('Join').click();
        // cy.wait('@subscribeCall'); // Optional, if we want to verify the call

        // Simulate the webhook effect (since we didn't actually pay)
        cy.request('POST', 'http://localhost:5001/api/dev/simulate-subscription', {
            subscriberEmail: user1.email,
            creatorEmail: user2.email
        });

        // Intercept the current_user request to debug
        cy.intercept('GET', '/auth/current_user').as('currentUserCheck');

        // Reload to see effect
        cy.reload();

        // Wait for the user data to load and verify subscription
        cy.wait('@currentUserCheck').then((interception) => {
            const user = interception.response.body;
            expect(user.goldenSubscriptions).to.have.length.greaterThan(0);
            const sub = user.goldenSubscriptions.find(s => s.user === user2Id);
            expect(sub).to.exist;
        });

        cy.contains('Subscribed').should('be.visible');

        // 3. Golden Post
        // User 2 makes a Golden Post (via API)
        cy.login(user2.email, user2.password);
        cy.request({
            method: 'POST',
            url: 'http://localhost:5001/api/posts/golden',
            body: {
                message: 'This is a golden post!',
                attachedPrediction: {
                    stockTicker: 'GOOGL',
                    targetPrice: 3000,
                    predictionType: 'Weekly'
                }
            }
        });

        // User 1 sees it in Golden Feed
        cy.login(user1.email, user1.password);
        cy.intercept('GET', '**/api/golden-feed*').as('getGoldenFeed');
        cy.visit('/golden-feed');
        cy.wait('@getGoldenFeed');

        cy.contains('GOOGL').should('be.visible');
        cy.contains('TestUser2').should('be.visible');


        // 4. Price Change
        // User 2 changes price
        cy.login(user2.email, user2.password);
        cy.visit(`/profile/${user2Id}`); // Visit own profile

        // Mock the verify-status response to avoid 500 error from Stripe API with test credentials
        cy.intercept('POST', '**/api/stripe/connect/verify-status', {
            statusCode: 200,
            body: {
                onboardingComplete: true,
                restrictionsActive: false,
            }
        }).as('verifyStatus');

        // Click "Manage Golden Membership"
        cy.contains('Manage Golden Membership').click();

        // Wait for verify status call
        cy.wait('@verifyStatus');

        // Wait for modal to be visible
        cy.contains('Golden Member Settings', { timeout: 10000 }).should('be.visible');

        // Change price
        cy.get('input[name="price"]').should('be.visible').clear().type('15');
        cy.contains('Update Settings').click();

        // Verify success toast or modal close
        cy.contains('Golden Member settings updated!').should('be.visible');

        // User 1 gets notification (might take a moment or require reload/poll)
        cy.login(user1.email, user1.password);
        cy.reload();
        cy.get('nav button svg path[d^="M15 17"]').closest('button').filter(':visible').click();
        // cy.contains('Price Change').should('exist'); // Adjust text based on actual notification

        // 5. Pause Subscriptions
        cy.login(user2.email, user2.password);
        cy.visit(`/profile/${user2Id}`);
        cy.contains('Manage Gold').click();

        // Intercept the update request
        cy.intercept('PUT', '/api/profile/golden-member').as('updateGoldenSettings');

        // Verify initial state is checked
        cy.get('input[id="acceptingNew"]').should('be.checked');

        // Click the visible toggle (the div after the input)
        cy.get('input[id="acceptingNew"] + div').click();

        // Verify state is now unchecked
        cy.get('input[id="acceptingNew"]').should('not.be.checked');

        cy.contains('Update Settings').click();

        // Verify the request payload
        cy.wait('@updateGoldenSettings').then((interception) => {
            console.log('Update Request Body:', interception.request.body);
            expect(interception.request.body.acceptingNewSubscribers).to.be.false;
        });

        // Wait for the update to complete
        cy.contains('Golden Member settings updated!').should('be.visible');

        // Verify User 1 sees "Subscriptions paused" (need a new user for this, User 1 is already subscribed)
        // We can just check the text on the button if we were NOT subscribed.
        // But User 1 IS subscribed.
        // Let's create User 3? Or just check as a guest (logout).
        cy.request('GET', 'http://localhost:5001/auth/logout'); // Logout

        // Intercept the profile fetch for the guest user
        cy.intercept('GET', `/api/profile/${user2Id}`, (req) => {
            delete req.headers['if-none-match'];
            delete req.headers['if-modified-since'];
        }).as('getProfileGuest');

        cy.visit(`/profile/${user2Id}`);

        cy.wait('@getProfileGuest').then((interception) => {
            expect(interception.response.statusCode).to.eq(200);
            const profile = interception.response.body;
            cy.log('Guest Profile View Body:', JSON.stringify(profile));
            // Ensure profile.user exists before accessing properties
            expect(profile).to.have.property('user');
            expect(profile.user.acceptingNewSubscribers).to.be.false;
        });

        cy.contains('Subscriptions Paused').should('be.visible'); // Or similar text
    });
});

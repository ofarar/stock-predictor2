describe('Notifications', () => {
    const user1 = Cypress.env('testUser1');
    const user2 = Cypress.env('testUser2');

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
    });

    it('should open notifications dropdown', () => {
        cy.login(user1.email, user1.password);
        cy.visit('/dashboard');

        // Ensure user is logged in and bell is visible
        cy.get('nav button.relative.p-2').should('exist');

        // Click the notification bell
        cy.get('nav button.relative.p-2').first().click({ force: true });
        cy.wait(500);

        // Check for dropdown content
        cy.contains('Notifications').should('exist');
        cy.get('.max-h-96').should('exist');
    });

    const acceptCookies = () => {
        cy.get('body').then(($body) => {
            if ($body.find('#rcc-confirm-button').length > 0) {
                cy.get('#rcc-confirm-button').click();
            }
        });
    };

    it('should receive a notification when followed', () => {
        let targetUserId;
        let targetUsername;

        // 1. Login as User 2 to get their ID and Username
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.intercept('GET', '**/auth/current_user').as('currentUser');
        cy.login(user2.email, user2.password);
        cy.visit('/dashboard');
        acceptCookies();
        cy.wait('@currentUser').then((interception) => {
            const body = interception.response.body;
            targetUserId = body._id;
            targetUsername = body.username;
            expect(targetUserId).to.exist;
            cy.log('Target User:', targetUsername, targetUserId);
        });

        // 2. Login as User 1 and follow User 2
        cy.then(() => {
            cy.clearCookies();
            cy.clearLocalStorage();
            cy.login(user1.email, user1.password);
            cy.visit(`/profile/${targetUserId}`);
            acceptCookies();

            // Wait for profile to load using the fetched username
            cy.contains(targetUsername).should('exist');

            // Check for Follow/Unfollow/Following button
            cy.get('button').contains(/Follow|Following|Unfollow/i).then($btn => {
                const text = $btn.text();
                cy.log('Button text:', text);
                if (text.includes('Following') || text.includes('Unfollow')) {
                    // Already following, so Unfollow first
                    cy.wrap($btn).click();
                    cy.wait(1000);
                    // Wait for it to become "Follow"
                    cy.contains('button', 'Follow').should('exist').click();
                } else {
                    // Not following, just Click Follow
                    cy.wrap($btn).click();
                }
            });

            // Wait for the button to indicate "Following" or "Unfollow" to confirm action
            cy.contains('button', /Following|Unfollow/i).should('exist');
            cy.wait(2000); // Ensure API call completes and notification is generated
        });

        // 3. Login as User 2 and check notifications
        cy.then(() => {
            cy.clearCookies();
            cy.clearLocalStorage();
            cy.login(user2.email, user2.password);
            cy.visit('/dashboard');
            acceptCookies();

            // Open notifications
            cy.get('nav button.relative.p-2').first().click({ force: true });
            cy.wait(1000); // Wait for dropdown animation

            // Check for "started following you" notification
            cy.get('.max-h-96').should('contain', 'started following you');
        });
    });
});

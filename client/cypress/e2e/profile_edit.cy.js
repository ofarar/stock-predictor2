describe('Profile Editing', () => {
    const user1 = Cypress.env('testUser1');
    let user1Id;

    before(() => {
        // Setup test user
        cy.request('POST', 'http://localhost:5001/api/dev/setup-test-users', {
            users: [
                { email: user1.email, username: 'TestUser1', googleId: 'test_id_1' }
            ]
        }).then((resp) => {
            const users = resp.body;
            user1Id = users.find(u => u.email === user1.email)._id;
        });
    });

    it('should allow editing profile', () => {
        cy.login(user1.email, user1.password);
        cy.visit('/profile/edit');

        // Change About text
        cy.get('textarea[name="about"]').clear().type('I am a test user.');
        cy.get('button[type="submit"]').click();

        // Verify
        cy.visit(`/profile/${user1Id}`);
        cy.contains('I am a test user.').should('be.visible');
    });
});

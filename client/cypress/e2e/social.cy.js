describe('Social Features', () => {
    const user1 = Cypress.env('testUser1');
    const user2 = Cypress.env('testUser2');

    beforeEach(() => {
        cy.login(user1.email, user1.password);
    });

    it('should follow and unfollow a user', () => {
        // Visit user2's profile (assuming we can search or go by URL)
        // We might need to know user2's ID or username. 
        // For now, let's try to find them in Explore or Leaderboard
        cy.visit('/scoreboard');

        // Find a user to follow (not self)
        // This is tricky without knowing the DOM structure of the scoreboard.
        // Let's assume we can click on a user profile link.
        cy.get('a[href*="/profile/"]').not(`[href*="${user1.username}"]`).first().click();

        // Click Follow
        cy.contains('Follow').click();
        cy.contains('Following').should('exist');

        // Click Unfollow (Clicking "Following" toggles it back to "Follow")
        cy.contains('Following').click();
        cy.contains('Follow').should('exist');
    });

    it('should like and dislike a prediction', () => {
        cy.visit('/explore');

        // Find a like button (Title is "Agree")
        cy.get('button[title="Agree"]').first().click();

        // Verify button state changed (Color change to green usually, checking class)
        cy.get('button[title="Agree"]').first().should('have.class', 'text-green-500');

        // Dislike (Unlike/Remove Vote) - Clicking again removes vote
        cy.get('button[title="Agree"]').first().click();
        cy.get('button[title="Agree"]').first().should('not.have.class', 'text-green-500');
    });
});

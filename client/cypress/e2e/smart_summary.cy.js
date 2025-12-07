describe('Smart Summary Feature', () => {
    beforeEach(() => {
        // Login before each test
        const user = Cypress.env('testUser1');
        cy.login(user.email, user.password);
    });

    it('should display the Smart Summary button on the profile page', () => {
        // Get current user to find ID
        cy.request('/auth/current_user').then((res) => {
            const userId = res.body._id;
            cy.visit(`/profile/${userId}`);

            // Check if the button exists and is visible
            cy.get('[data-testid=smart-summary-btn]').should('be.visible');
        });
    });

    it('should open the Smart Summary modal when the button is clicked', () => {
        cy.request('/auth/current_user').then((res) => {
            const userId = res.body._id;
            cy.visit(`/profile/${userId}`);

            // Click the button
            cy.get('[data-testid=smart-summary-btn]').click();

            // Check if modal title is visible
            cy.contains('Smart Summary').should('be.visible');

            // Check for share buttons
            cy.contains('X').should('be.visible');
            cy.contains('Telegram').should('be.visible');

            // Check for summary text (should contain at least some text)
            cy.get('.bg-gray-900\\/50').should('not.be.empty');
        });
    });

    it('should close the modal when the close button is clicked', () => {
        cy.request('/auth/current_user').then((res) => {
            const userId = res.body._id;
            cy.visit(`/profile/${userId}`);

            cy.get('[data-testid=smart-summary-btn]').click();

            // Click the close button (assuming it's the SVG button in top right)
            cy.get('.fixed.inset-0').find('button').first().click();

            // Modal should no longer be visible
            cy.get('[data-testid=smart-summary-modal]').should('not.exist');
        });
    });
});

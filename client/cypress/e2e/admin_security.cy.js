
describe('Admin Security', () => {
    it('should redirect guest users to home', () => {
        // 1. Mock No User (Guest)
        cy.intercept('GET', '**/auth/current_user', {
            statusCode: 200,
            body: "" // Empty body often implies no user or null in some setups, or use empty string/null
        }).as('getGuestUser');

        cy.visit('/admin');
        cy.wait('@getGuestUser');

        // Should be redirected to home
        cy.url().should('eq', Cypress.config().baseUrl + '/');
        cy.location('pathname').should('eq', '/');
    });

    it('should redirect non-admin users to home', () => {
        // 1. Mock Regular User
        cy.intercept('GET', '**/auth/current_user', {
            statusCode: 200,
            body: {
                _id: 'user123',
                username: 'RegularJoe',
                email: 'joe@test.com',
                isAdmin: false // Key: Not an admin
            }
        }).as('getRegularUser');

        cy.visit('/admin');
        cy.wait('@getRegularUser');

        // Should be redirected to home
        cy.url().should('eq', Cypress.config().baseUrl + '/');
        cy.location('pathname').should('eq', '/');
    });

    it('should allow admin users to access', () => {
        // 1. Mock Admin User
        cy.intercept('GET', '**/auth/current_user', {
            statusCode: 200,
            body: {
                _id: 'admin123',
                username: 'SuperAdmin',
                email: 'admin@test.com',
                isAdmin: true // Key: Is Admin
            }
        }).as('getAdminUser');

        // Mock settings to prevent prop-type errors or loading states
        cy.intercept('GET', '**/api/settings', { statusCode: 200, body: {} });
        cy.intercept('GET', '**/api/admin/all-users*', { statusCode: 200, body: [] });

        cy.visit('/admin');
        cy.wait('@getAdminUser');

        // Should stay on admin page
        cy.url().should('include', '/admin');
    });
});

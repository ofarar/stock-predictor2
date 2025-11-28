describe('Connectivity Test', () => {
    it('visits home page', () => {
        cy.visit('/');
        cy.get('body').should('exist');
    });

    it('checks backend connectivity', () => {
        cy.request('GET', 'http://localhost:5001/auth/current_user').then((resp) => {
            // It might return 200 (empty user) or 401 depending on auth state, but it should connect
            expect(resp.status).to.be.oneOf([200, 401, 403]);
        });
    });
});

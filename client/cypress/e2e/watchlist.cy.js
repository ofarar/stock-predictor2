describe('Watchlist Management', () => {
    const user = Cypress.env('testUser1');
    const stockSymbol = 'NVDA';

    beforeEach(() => {
        // Set viewport to desktop to ensure menu is visible
        cy.viewport(1920, 1080);
        cy.login(user.email, user.password);
        cy.visit('/');
    });

    it('should add a stock to the watchlist', () => {
        // Search for a stock
        // Header uses <nav>, not <header>
        // Use :visible to avoid the hidden mobile/desktop duplicate
        cy.get('nav').find('input[placeholder*="Search"]').filter(':visible').type(stockSymbol);

        // Wait for results and click
        cy.wait(1000);
        cy.contains(stockSymbol).click();

        // Ensure clean state: if it's already in watchlist (Remove button exists), remove it first
        cy.get('body').then(($body) => {
            const removeBtn = $body.find('[data-testid="watchlist-button"][title="Remove from Watchlist"]');
            if (removeBtn.length > 0) {
                cy.log('Item found in watchlist, removing it first...');
                cy.wrap(removeBtn).click();
                cy.wait(2000); // Wait for removal API
            } else {
                cy.log('Item NOT in watchlist, proceeding to add.');
            }
        });

        // Now we are sure it's NOT in watchlist (button is "Add to Watchlist")
        // On Stock Page, click "Add to Watchlist" (heart icon)
        // Use data-testid for robustness
        cy.get('[data-testid="watchlist-button"]').should('have.attr', 'title', 'Add to Watchlist');
        cy.get('[data-testid="watchlist-button"]').click();

        // Verify it's added (toast appears) and button turns red
        cy.wait(2000); // Wait for add API
        cy.get('[data-testid="watchlist-button"]').should('have.attr', 'title', 'Remove from Watchlist');
        cy.get('[data-testid="watchlist-button"]').should('have.class', 'text-red-500');

        // Verify it appears on the Profile Page
        cy.get('img[alt="Avatar"]').click();
        cy.contains('My Profile').click();

        // Wait for profile to load
        cy.url().should('include', '/profile/');
        cy.contains(stockSymbol).should('exist');
    });

    it('should view watchlist and remove item', () => {
        // Intercept the watchlist update call
        cy.intercept('PUT', '**/api/watchlist').as('updateWatchlist');

        // Ensure we have the item in watchlist (from previous test or add it again)
        // It's safer to add it again or assume it's there if tests run sequentially.
        // Let's add it again to be safe.
        cy.visit(`/stock/${stockSymbol}`);
        cy.wait(1000);
        cy.get('body').then(($body) => {
            // Check if we need to add it (if the button title is "Add to Watchlist")
            // We can check the title attribute of the button with the testid
            if ($body.find('[data-testid="watchlist-button"][title="Add to Watchlist"]').length > 0) {
                cy.get('[data-testid="watchlist-button"]').click();
                // Wait for the API call to complete
                cy.wait('@updateWatchlist');
            }
        });

        cy.visit('/watchlist');

        // Wait for loading to finish
        cy.contains('Loading...').should('not.exist');

        // Check if the list exists and has items
        // The class might not be .watchlist-item, let's check for the stock symbol link
        cy.contains(stockSymbol, { timeout: 10000 }).should('exist');

        // Remove from watchlist (using the remove button in the card)
        // WatchlistPage.jsx usually has a remove button on the card
        // Let's assume there's a button with title "Remove NVDA from watchlist" or similar
        // Or we can go back to stock page to remove it to be safe and clean up
        cy.visit(`/stock/${stockSymbol}`);
        cy.get('[data-testid="watchlist-button"]').click();
        cy.wait(1000);
        cy.get('[data-testid="watchlist-button"]').should('have.attr', 'title', 'Add to Watchlist');
    });
});

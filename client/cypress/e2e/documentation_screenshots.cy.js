describe('Documentation Screenshots', () => {
    const email = 'ofarar@gmail.com';
    const password = '**********';

    beforeEach(() => {
        // Set viewport to 1200px width to match max-w-6xl (1152px) container closely, reducing side margins.
        // At this width, the header uses the mobile menu (hamburger) instead of the desktop user menu.
        cy.viewport(1200, 900);
    });

    it('captures screenshots for the ad document', () => {
        // 1. Login using custom command
        cy.login(email, password);

        // 2. HomePage
        cy.visit('/');

        // Handle Cookie Consent if present
        cy.get('body').then(($body) => {
            if ($body.find('button:contains("Accept")').length > 0) {
                cy.contains('button', 'Accept').click();
                cy.wait(500); // Wait for banner to disappear
            }
        });

        cy.wait(3000); // Wait for data to load
        cy.screenshot('01_homepage', { capture: 'viewport' });

        // 3. Prediction Widget (Focus)
        cy.get('input[placeholder*="Search"]').first().scrollIntoView({ block: 'center', inline: 'center' });
        cy.wait(1000);
        cy.screenshot('02_prediction_widget', { capture: 'viewport' });

        // NEW: Prediction Cards (Hourly Winners Feed) - Located on Dashboard
        cy.visit('/dashboard');
        cy.wait(3000);
        // "Last Hour's Winners" is the default English text for 'hourlyWinnersFeed.title'
        cy.contains("Last Hour's Winners").scrollIntoView({ block: 'center', inline: 'center' });
        cy.wait(1000);
        cy.screenshot('03_prediction_cards_dashboard', { capture: 'viewport' });

        // 4. Scoreboard
        cy.visit('/scoreboard');
        cy.wait(3000);
        cy.screenshot('04_scoreboard', { capture: 'viewport' });

        // 5. Profile Page
        // At 1200px, the desktop avatar is hidden. We must use the mobile menu.
        // Click the hamburger menu button. It's the last button in the nav usually, or we can find it by SVG path.
        // The hamburger icon path starts with M4 6h16...
        cy.get('nav button svg path[d^="M4 6h16"]').closest('button').click();
        cy.wait(500);
        // Now click "My Profile" in the mobile menu
        cy.contains('a', 'My Profile').click();

        cy.wait(3000);
        cy.screenshot('05_profile_overview', { capture: 'viewport' });

        // Active Predictions
        cy.contains('Active Predictions').scrollIntoView({ block: 'center', inline: 'center' });
        cy.wait(1000);
        cy.screenshot('06_profile_active_predictions', { capture: 'viewport' });

        // Prediction History
        cy.contains('Prediction History').scrollIntoView({ block: 'center', inline: 'center' });
        cy.wait(1000);
        cy.screenshot('07_profile_history', { capture: 'viewport' });

        // Followers
        cy.get('nav').scrollIntoView();
        cy.contains('Followers').click();
        cy.wait(3000);
        cy.screenshot('08_profile_followers', { capture: 'viewport' });

        // Go back to profile for Creator Pool
        cy.go('back');
        cy.wait(2000);

        // 6. Creator Pool Share
        cy.contains('Creator Pool Share').click();
        cy.wait(2000); // Wait for modal

        // Wait for loading state to disappear
        cy.get('body').then(($body) => {
            if ($body.find('p:contains("Loading Leaderboard...")').length > 0) {
                cy.contains('Loading Leaderboard...').should('not.exist');
            }
        });

        cy.screenshot('09_creator_pool_modal', { capture: 'viewport' });

        // Click the first user in the list to see the chart
        // Robust selector: Find buttons inside the modal that contain an image
        cy.get('[data-testid="creator-pool-modal"]').then(($modal) => {
            const userButtons = $modal.find('button:has(img)');
            if (userButtons.length > 0) {
                cy.wrap(userButtons.first()).click();
                cy.wait(1000);
                cy.screenshot('10_creator_pool_detail', { capture: 'viewport' });
            } else {
                cy.log('⚠️ No users found in Creator Pool leaderboard. Skipping detail screenshot.');
            }
        });

        // Close modal
        cy.get('body').click(0, 0);

        // 7. Golden Membership
        // We might need to open the menu again if we are on mobile view and want to find "Manage Golden" button if it's in the header?
        // But "Become Golden" is usually on the profile page itself or header.
        // On Profile Page (where we are), there are buttons.
        cy.get('body').then(($body) => {
            // Check for buttons on the page first
            if ($body.find('button:contains("Become Golden")').length > 0) {
                cy.contains('button', 'Become Golden').click();
                cy.wait(1000);
                cy.screenshot('11_golden_membership_modal', { capture: 'viewport' });
                cy.get('body').click(0, 0);
            } else if ($body.find('button:contains("Manage Golden")').length > 0) {
                cy.contains('button', 'Manage Golden').click();
                cy.wait(1000);
                cy.screenshot('11_golden_membership_manage', { capture: 'viewport' });
                cy.get('body').click(0, 0);
            }
        });

        // 8. AI Wizard
        cy.visit('/ai-wizard');
        cy.wait(3000);
        cy.screenshot('12_ai_wizard', { capture: 'viewport' });

        // 9. Stock Page (AAPL)
        cy.visit('/stock/AAPL');
        cy.wait(5000);
        cy.screenshot('13_stock_page_aapl', { capture: 'viewport' });

        // 10. Recommended Users
        cy.contains('Top Predictors').scrollIntoView({ block: 'center', inline: 'center' });
        cy.wait(1000);
        cy.screenshot('14_stock_page_top_predictors', { capture: 'viewport' });

        // 11. Notifications
        // In mobile view (1200px < 1536px), the bell is visible in the top right next to hamburger.
        cy.get('nav button svg path[d^="M15 17"]').closest('button').filter(':visible').click();
        cy.wait(1000);
        cy.screenshot('15_notifications', { capture: 'viewport' });
    });
});

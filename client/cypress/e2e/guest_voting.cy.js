describe('Guest Voting', () => {
    beforeEach(() => {
        // Clear cookies to ensure fresh guest session
        cy.clearCookies();
        // Visit explore page where predictions are listed
        cy.visit('/explore');
        // Wait for predictions to load
        cy.get('button[title="Agree"]').should('have.length.at.least', 1);
    });

    it('should allow a guest to like a prediction and persist after reload', () => {
        // Target the first prediction's Agree (Like) button
        cy.get('button[title="Agree"]').first().as('likeBtn');
        cy.get('button[title="Disagree"]').first().as('dislikeBtn');

        // Capture initial count
        cy.get('@likeBtn').invoke('text').then((text) => {
            const initialCount = parseInt(text.trim()) || 0;

            // 1. Click Like
            cy.get('@likeBtn').click();

            // 2. Verify Optimistic Update (Green color)
            cy.get('@likeBtn').should('have.class', 'text-green-500');

            // 3. Verify Count Incremented
            cy.get('@likeBtn').should('contain', initialCount + 1);

            // 4. Reload Page
            cy.reload();

            // 5. Verify Persistence
            cy.get('button[title="Agree"]').first().should('have.class', 'text-green-500');
            cy.get('button[title="Agree"]').first().should('contain', initialCount + 1);
        });
    });

    it('should allow a guest to switch from like to dislike', () => {
        cy.get('button[title="Agree"]').first().as('likeBtn');
        cy.get('button[title="Disagree"]').first().as('dislikeBtn');

        // Capture initial counts
        cy.get('@likeBtn').invoke('text').as('initLikeText');
        cy.get('@dislikeBtn').invoke('text').as('initDislikeText');

        cy.get('@initLikeText').then(likeText => {
            const initLikes = parseInt(likeText.trim()) || 0;
            cy.get('@initDislikeText').then(dislikeText => {
                const initDislikes = parseInt(dislikeText.trim()) || 0;

                // 1. Vote Like
                cy.get('@likeBtn').click();
                cy.get('@likeBtn').should('have.class', 'text-green-500');

                // 2. Switch to Dislike
                cy.get('@dislikeBtn').click();

                // 3. Verify Like removed, Dislike active
                cy.get('@likeBtn').should('not.have.class', 'text-green-500');
                // Note: Depending on race conditions with optimistic UI + server response, 
                // we might need to be careful with assertions. But checking class is usually safe.
                cy.get('@dislikeBtn').should('have.class', 'text-red-500');

                // 4. Verify Counts (Likes should be back to initial, Dislikes +1)
                cy.get('@likeBtn').should('contain', initLikes);
                cy.get('@dislikeBtn').should('contain', initDislikes + 1);
            });
        });
    });

    it('should prevent multiple votes on same action (toggle off)', () => {
        cy.get('button[title="Agree"]').first().as('likeBtn');

        cy.get('@likeBtn').invoke('text').then((text) => {
            const initialCount = parseInt(text.trim()) || 0;

            // 1. Click Like
            cy.get('@likeBtn').click();
            cy.get('@likeBtn').should('have.class', 'text-green-500');

            // 2. Click Like again (Toggle Off)
            cy.get('@likeBtn').click();

            // 3. Verify Grey and Count Reset
            cy.get('@likeBtn').should('not.have.class', 'text-green-500');
            cy.get('@likeBtn').should('contain', initialCount);
        });
    });
});

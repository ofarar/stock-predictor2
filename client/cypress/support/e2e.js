// Import commands.js using ES2015 syntax:
import './commands'

// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

const user1 = Cypress.env('testUser1');
const user2 = Cypress.env('testUser2');

before(() => {
    // Ensure test users exist before any tests run
    // This acts as a global setup
    cy.log('Global Setup: Creating Test Users');
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
    });
});

after(() => {
    // Clean up test users and their data after all tests finish
    cy.log('Global Teardown: Cleaning up Test Users');
    cy.request('POST', 'http://localhost:5001/api/dev/cleanup-test-users', {
        emails: [user1.email, user2.email]
    });
});

// Alternatively you can use CommonJS syntax:
// require('./commands')

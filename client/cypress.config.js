const { defineConfig } = require("cypress");

module.exports = defineConfig({
    e2e: {
        baseUrl: "http://localhost:5173",
        setupNodeEvents(on, config) {
            // implement node event listeners here
        },
        viewportWidth: 1280,
        viewportHeight: 720,
    },
    env: {
        testUser1: {
            email: "predictostock@gmail.com",
            password: "ofa0087110"
        },
        testUser2: {
            email: "stockpredictor4@gmail.com",
            password: "ofa0087110"
        }
    }
});

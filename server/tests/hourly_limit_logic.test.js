const rateLimit = require('express-rate-limit');
const { PREDICT_LIMIT } = require('../constants');

// Mock express-rate-limit BEFORE requiring the route file
// We return the options object itself so we can inspect it
jest.mock('express-rate-limit', () => {
    return jest.fn((options) => (req, res, next) => next());
});

jest.mock('uuid', () => ({
    v4: () => 'mock-uuid'
}));

// We need to require the file to trigger the rateLimit call
// We mock other dependencies to avoid errors
jest.mock('../models/Prediction', () => ({}));
jest.mock('../models/User', () => ({}));
jest.mock('../models/Notification', () => ({}));
jest.mock('../models/Setting', () => ({}));
jest.mock('../services/financeAPI', () => ({}));
jest.mock('../utils/sentimentHelper', () => ({}));
jest.mock('../services/pushNotificationService', () => ({}));

describe('Hourly Rate Limit Logic', () => {
    let predictLimiterOptions;

    beforeAll(() => {
        // Reset modules to ensure clean require
        jest.resetModules();

        // Re-require the mocked module to get the instance that will be used by predictions.js
        const rateLimitMock = require('express-rate-limit');

        // Require the file, which executes the rateLimit() call
        require('../routes/predictions');

        // logging calls for debug
        const calls = rateLimitMock.mock.calls;
        // console.log('Mock calls:', JSON.stringify(calls, null, 2));

        // Find the call to rateLimit that corresponds to predictLimiter
        // We look for the one with the dynamic max function. 
        // rateLimit({ ... max: (req) => ... })
        const match = calls.find(call => call[0] && typeof call[0].max === 'function');

        if (match) {
            predictLimiterOptions = match[0];
        }
    });

    test('should be defined', () => {
        expect(predictLimiterOptions).toBeDefined();
        expect(typeof predictLimiterOptions.max).toBe('function');
    });

    test('should use global PREDICT_LIMIT when user is not present', () => {
        const req = {}; // No user
        const limit = predictLimiterOptions.max(req);
        expect(limit).toBe(PREDICT_LIMIT);
    });

    test('should use global PREDICT_LIMIT when user has no rateLimitHourly', () => {
        const req = { user: { _id: '123' } }; // user exists but no limit
        const limit = predictLimiterOptions.max(req);
        expect(limit).toBe(PREDICT_LIMIT);
    });

    test('should use global PREDICT_LIMIT when rateLimitHourly is null', () => {
        const req = { user: { _id: '123', rateLimitHourly: null } };
        const limit = predictLimiterOptions.max(req);
        expect(limit).toBe(PREDICT_LIMIT);
    });

    test('should use user.rateLimitHourly when it is set', () => {
        const customLimit = 50;
        const req = { user: { _id: '123', rateLimitHourly: customLimit } };
        const limit = predictLimiterOptions.max(req);
        expect(limit).toBe(customLimit);
    });

    test('should use user.rateLimitHourly even if it is 0', () => {
        const customLimit = 0;
        const req = { user: { _id: '123', rateLimitHourly: customLimit } };
        const limit = predictLimiterOptions.max(req);
        expect(limit).toBe(customLimit);
    });
});

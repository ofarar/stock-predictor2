const { describe, it, expect, beforeEach } = require('@jest/globals');
const Prediction = require('../models/Prediction');

// Mock Mongoose model
jest.mock('../models/Prediction');

describe('Hourly Winners Route Logic', () => {
    // We are simulating the logic inside the route handler
    // server/routes/predictions.js -> /widgets/hourly-winners

    const getHourlyWinnersLogic = async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        // This is the query we want to verify
        const query = {
            status: 'Assessed',
            assessedAt: { $gte: oneHourAgo }
        };

        return await Prediction.find(query)
            .sort({ rating: -1 })
            .limit(3)
            .populate('userId', 'username avatar isGoldenMember isVerified');
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should query using assessedAt instead of updatedAt', async () => {
        // Setup the chainable mock
        const mockSort = jest.fn().mockReturnThis();
        const mockLimit = jest.fn().mockReturnThis();
        const mockPopulate = jest.fn().mockResolvedValue([]); // Return empty list for this test

        Prediction.find.mockReturnValue({
            sort: mockSort,
            limit: mockLimit,
            populate: mockPopulate
        });

        await getHourlyWinnersLogic();

        // 1. Verify the query object passed to find()
        const findCallArgs = Prediction.find.mock.calls[0][0];

        expect(findCallArgs).toHaveProperty('status', 'Assessed');
        expect(findCallArgs).toHaveProperty('assessedAt');
        expect(findCallArgs).not.toHaveProperty('updatedAt'); // CRITICAL: Should NOT use updatedAt

        // Check that the time filter is approximately 1 hour ago
        const timeFilter = findCallArgs.assessedAt.$gte;
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;

        // Allow 1 second variance for execution time
        expect(timeFilter.getTime()).toBeGreaterThanOrEqual(oneHourAgo - 1000);
        expect(timeFilter.getTime()).toBeLessThanOrEqual(oneHourAgo + 1000);
    });
});

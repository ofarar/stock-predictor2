const { describe, it, expect, beforeEach } = require('@jest/globals');
const Prediction = require('../models/Prediction');

// Mock Mongoose model
jest.mock('../models/Prediction');

describe('Famous Stocks Route Logic', () => {
    // We are simulating the logic inside the route handler
    // server/routes/market.js -> /widgets/famous-stocks

    const getFamousStocksLogic = async (isToday = true) => {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        if (isToday) {
            return await Prediction.aggregate([
                { $match: { createdAt: { $gte: startOfDay }, status: 'Active' } },
                { $group: { _id: '$stockTicker', predictions: { $sum: 1 } } },
                { $sort: { predictions: -1 } },
                { $limit: 4 }
            ]);
        } else {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
            sevenDaysAgo.setUTCHours(0, 0, 0, 0);

            return await Prediction.aggregate([
                { $match: { createdAt: { $gte: sevenDaysAgo }, status: 'Active' } },
                { $group: { _id: '$stockTicker', predictions: { $sum: 1 } } },
                { $sort: { predictions: -1 } },
                { $limit: 4 }
            ]);
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should query for Active predictions only (Today Mode)', async () => {
        const mockAggregate = jest.fn().mockResolvedValue([]);
        Prediction.aggregate = mockAggregate;

        await getFamousStocksLogic(true);

        const pipeline = Prediction.aggregate.mock.calls[0][0];
        const matchStage = pipeline[0].$match;

        expect(matchStage).toHaveProperty('status', 'Active');
        expect(matchStage).toHaveProperty('createdAt');
    });

    it('should query for Active predictions only (Historical Mode)', async () => {
        const mockAggregate = jest.fn().mockResolvedValue([]);
        Prediction.aggregate = mockAggregate;

        await getFamousStocksLogic(false);

        const pipeline = Prediction.aggregate.mock.calls[0][0];
        const matchStage = pipeline[0].$match;

        expect(matchStage).toHaveProperty('status', 'Active');
        expect(matchStage).toHaveProperty('createdAt');
    });
});

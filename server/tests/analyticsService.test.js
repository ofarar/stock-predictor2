const { recalculateUserAnalytics } = require('../services/analyticsService');
const Prediction = require('../models/Prediction');
const { awardBadges } = require('../services/badgeService');

// Mock dependencies
jest.mock('../models/Prediction');
jest.mock('../services/badgeService');

describe('analyticsService', () => {
    let mockUser;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUser = {
            _id: 'user123',
            badges: ['old_badge'],
            analystRating: {
                total: 500,
                fromShares: 50,
                fromReferrals: 20,
                fromPredictions: 100,
                predictionBreakdownByStock: new Map()
            },
            save: jest.fn().mockResolvedValue(true)
        };
    });

    it('should reset user stats and recalculate correctly', async () => {
        // Mock Predictions found (for points calculation)
        const mockPredictions = [
            { stockTicker: 'AAPL', rating: 95 }, // +10 points
            { stockTicker: 'TSLA.NE', rating: 85 }, // +5 points
            { stockTicker: 'GOOG', rating: 60 }  // +0 points
        ];
        Prediction.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockPredictions) });

        // Mock Aggregation (for avgRating)
        Prediction.aggregate.mockResolvedValue([{ avgRating: 80.0 }]);

        // Mock Badge Awarding
        awardBadges.mockImplementation(async (user) => {
            user.analystRating.fromBadges = 200; // Simulate badge points awarded
        });

        await recalculateUserAnalytics(mockUser);

        // 1. Verify Structure Reset
        expect(mockUser.badges).toEqual([]);


        // 2. Verify Points Calculation
        // 95->10 pts, 85->5 pts, 60->0 pts. Total = 15.
        // It accumulates user.analystRating.fromPredictions inside the loop.
        // Wait, the function sets it to 0 then adds.
        // After execution, we expect `fromPredictions` to be 15.
        // And `fromBadges` to be 200 (from mock).
        // `fromShares` (50) and `fromReferrals` (20) should be preserved or re-assigned?
        // In the code: `user.analystRating.total = sharesPoints + referralPoints;` (initially)
        // Then at end: `total = predictions + badges + shares + referrals + ranks`

        // Total should be: 15 (preds) + 200 (badges) + 50 (shares) + 20 (referrals) = 285.
        const expectedTotal = 15 + 200 + 50 + 20;

        expect(mockUser.analystRating.fromPredictions).toBe(15);
        expect(mockUser.analystRating.total).toBe(expectedTotal);
        expect(mockUser.avgRating).toBe(80.0);

        // Verify Dependencies called
        expect(awardBadges).toHaveBeenCalledWith(mockUser);
        expect(mockUser.save).toHaveBeenCalled();

        // Verify Map Update
        expect(mockUser.analystRating.predictionBreakdownByStock.get('AAPL')).toBe(10);
        expect(mockUser.analystRating.predictionBreakdownByStock.get('TSLA_NE')).toBe(5);
    });

    it('should handle zero predictions correctly', async () => {
        Prediction.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
        Prediction.aggregate.mockResolvedValue([]); // No results

        await recalculateUserAnalytics(mockUser);

        expect(mockUser.analystRating.fromPredictions).toBe(0);
        expect(mockUser.avgRating).toBe(0);
        // Total = 50 (shares) + 20 (referrals) = 70.
        expect(mockUser.analystRating.total).toBe(70);
    });
});

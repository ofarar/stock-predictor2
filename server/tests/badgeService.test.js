// server/tests/badgeService.test.js
const { awardBadges } = require('../services/badgeService');
const User = require('../models/User');
const Prediction = require('../models/Prediction');
const Setting = require('../models/Setting');
const Notification = require('../models/Notification');

// Mock Mongoose models
jest.mock('../models/User');
jest.mock('../models/Prediction');
jest.mock('../models/Setting');
jest.mock('../models/Notification');

describe('badgeService', () => {
    let mockUser;
    let mockSettings;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUser = {
            _id: 'user123',
            username: 'testuser',
            badges: [],
            analystRating: {
                total: 1000,
                fromBadges: 0,
                badgeBreakdown: new Map()
            },
            save: jest.fn().mockResolvedValue(true)
        };

        mockSettings = {
            badgeSettings: {
                'market_maven': {
                    name: 'Market Maven',
                    minPredictions: 5,
                    tiers: {
                        Bronze: { rating: 70 },
                        Silver: { rating: 80 },
                        Gold: { rating: 90 }
                    }
                },
                'stock_scholar': { // Example type-specific badge
                    name: 'Stock Scholar',
                    minPredictions: 3,
                    tiers: {
                        Bronze: { rating: 75 }
                    }
                }
            }
        };

        Setting.findOneAndUpdate.mockResolvedValue(mockSettings);

        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should not award badges if no assessed predictions', async () => {
        Prediction.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

        await awardBadges(mockUser);

        expect(mockUser.save).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No assessed predictions'));
    });

    it('should award Bronze Market Maven badge when criteria met', async () => {
        const predictions = Array(5).fill({ rating: 72, predictionType: 'Hourly', status: 'Assessed' });
        Prediction.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(predictions) });

        await awardBadges(mockUser);

        expect(mockUser.badges).toContainEqual({ badgeId: 'market_maven', tier: 'Bronze' });
        expect(mockUser.analystRating.total).toBe(1100); // 1000 + 100
        expect(mockUser.save).toHaveBeenCalled();
        expect(Notification.prototype.save).toHaveBeenCalled();
    });

    it('should upgrade to Gold Market Maven badge and award difference', async () => {
        // User already has Bronze
        mockUser.badges = [{ badgeId: 'market_maven', tier: 'Bronze' }];

        const predictions = Array(5).fill({ rating: 95, predictionType: 'Hourly', status: 'Assessed' });
        Prediction.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(predictions) });

        await awardBadges(mockUser);

        // Should now have Gold (Bronze removed/updated)
        expect(mockUser.badges).toContainEqual({ badgeId: 'market_maven', tier: 'Gold' });
        expect(mockUser.badges.length).toBe(1);

        // Gold is 500 points. 
        expect(mockUser.analystRating.total).toBe(1500); // 1000 + 500
        expect(mockUser.save).toHaveBeenCalled();
    });

    it('should not downgrade badge if rating drops', async () => {
        // User has Gold
        mockUser.badges = [{ badgeId: 'market_maven', tier: 'Gold' }];

        // Performance drops to Bronze level
        const predictions = Array(5).fill({ rating: 72, predictionType: 'Hourly', status: 'Assessed' });
        Prediction.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(predictions) });

        await awardBadges(mockUser);

        // Should still have Gold
        expect(mockUser.badges).toContainEqual({ badgeId: 'market_maven', tier: 'Gold' });
        expect(mockUser.save).not.toHaveBeenCalled();
    });

    it('should award type-specific badge', async () => {
        const predictions = [
            { rating: 80, predictionType: 'Stock', status: 'Assessed' },
            { rating: 80, predictionType: 'Stock', status: 'Assessed' },
            { rating: 80, predictionType: 'Stock', status: 'Assessed' }
        ];
        Prediction.find.mockReturnValue({ lean: jest.fn().mockResolvedValue(predictions) });

        await awardBadges(mockUser);

        expect(mockUser.badges).toContainEqual({ badgeId: 'stock_scholar', tier: 'Bronze' });
        expect(mockUser.save).toHaveBeenCalled();
    });
});

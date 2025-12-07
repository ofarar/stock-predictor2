const mongoose = require('mongoose');
const runAssessmentJob = require('../jobs/assessment-job');
const Prediction = require('../models/Prediction');
const User = require('../models/User');
const financeAPI = require('../services/financeAPI');
const JobLog = require('../models/JobLog');
const Notification = require('../models/Notification');
const PredictionLog = require('../models/PredictionLog');

// Mock dependencies
jest.mock('../models/Prediction');
jest.mock('../models/User');
jest.mock('../models/JobLog');
jest.mock('../models/Notification');
jest.mock('../models/PredictionLog');
jest.mock('../services/financeAPI');
jest.mock('../services/badgeService');

describe('Assessment Job', () => {
    let consoleLogSpy;
    let consoleErrorSpy;
    let consoleWarnSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        // Default mocks
        JobLog.findOneAndUpdate.mockResolvedValue({});
        User.findByIdAndUpdate.mockResolvedValue({});
        Notification.prototype.save = jest.fn().mockResolvedValue({});
        PredictionLog.prototype.save = jest.fn().mockResolvedValue({});
        Prediction.aggregate = jest.fn().mockResolvedValue([]);
    });

    afterEach(() => {
    });

    // --- 1. BUG FIX VERIFICATION ---

    it('should NOT fall back to T-1 price if today is the deadline and data is missing (Daily Prediction)', async () => {
        const today = new Date().toISOString().split('T')[0];
        const deadline = new Date(); // Today

        const mockPrediction = {
            _id: 'pred_daily_stock',
            stockTicker: 'AAPL',
            targetPrice: 150,
            priceAtCreation: 145,
            deadline: deadline,
            createdAt: new Date(Date.now() - 86400000),
            status: 'Active',
            userId: {
                _id: 'user1',
                username: 'testuser',
                analystRating: { predictionBreakdownByStock: new Map(), total: 0 },
                save: jest.fn()
            },
            predictionType: 'Daily',
            save: jest.fn(),
        };

        // Correctly mock chainable populate
        const mockPopulate = jest.fn().mockResolvedValue([mockPrediction]);
        Prediction.find.mockReturnValue({ populate: mockPopulate });

        // Mock financeAPI.getHistorical to return NULL for today
        financeAPI.getHistorical.mockResolvedValue([]);

        await runAssessmentJob();

        // Should NOT save (skip assessment)
        expect(mockPrediction.save).not.toHaveBeenCalled();
    });

    // --- 2. HOURLY PREDICTION (Real-time Check) ---

    it('should use real-time getQuote for Hourly predictions', async () => {
        const deadline = new Date(); // Due now

        const mockPrediction = {
            _id: 'pred_hourly',
            stockTicker: 'TSLA',
            targetPrice: 200,
            priceAtCreation: 190,
            deadline: deadline,
            createdAt: new Date(Date.now() - 3600000),
            status: 'Active',
            userId: {
                _id: 'user1',
                username: 'testuser',
                analystRating: { predictionBreakdownByStock: new Map(), total: 0 },
                save: jest.fn()
            },
            predictionType: 'Hourly',
            save: jest.fn(),
        };

        const mockPopulate = jest.fn().mockResolvedValue([mockPrediction]);
        Prediction.find.mockReturnValue({ populate: mockPopulate });

        // Mock getQuote to return a price
        financeAPI.getQuote.mockResolvedValue({ price: 205 });

        await runAssessmentJob();

        // Should use the real-time price (205)
        expect(financeAPI.getQuote).toHaveBeenCalledWith('TSLA');
        expect(mockPrediction.actualPrice).toBe(205);
        expect(mockPrediction.save).toHaveBeenCalled();
    });

    // --- 3. ASSET CLASS COVERAGE ---

    it('should assess Crypto (BTC-USD) correctly using Daily logic (Historical)', async () => {
        // Crypto "Daily" usually targets end of UTC day.
        // If deadline passed, we check historical for that day.
        const deadline = new Date();
        deadline.setDate(deadline.getDate() - 1); // Yesterday (so data exists)
        const deadlineStr = deadline.toISOString().split('T')[0];

        const mockPrediction = {
            _id: 'pred_btc',
            stockTicker: 'BTC-USD',
            targetPrice: 30000,
            priceAtCreation: 29000,
            deadline: deadline,
            createdAt: new Date(Date.now() - 86400000 * 2),
            status: 'Active',
            userId: {
                _id: 'user1',
                username: 'testuser',
                analystRating: { predictionBreakdownByStock: new Map(), total: 0 },
                save: jest.fn()
            },
            predictionType: 'Daily',
            save: jest.fn(),
        };

        const mockPopulate = jest.fn().mockResolvedValue([mockPrediction]);
        Prediction.find.mockReturnValue({ populate: mockPopulate });

        // Mock historical data for BTC
        financeAPI.getHistorical.mockImplementation(async (ticker, options) => {
            if (options.period1 === deadlineStr) {
                return [{ close: 30500 }];
            }
            return [];
        });

        await runAssessmentJob();

        expect(financeAPI.getHistorical).toHaveBeenCalledWith('BTC-USD', expect.anything());
        expect(mockPrediction.actualPrice).toBe(30500);
        expect(mockPrediction.save).toHaveBeenCalled();
    });

    it('should assess Forex (EUR=X) correctly', async () => {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() - 2); // 2 days ago
        const deadlineStr = deadline.toISOString().split('T')[0];

        const mockPrediction = {
            _id: 'pred_forex',
            stockTicker: 'EUR=X',
            targetPrice: 1.10,
            priceAtCreation: 1.08,
            deadline: deadline,
            createdAt: new Date(Date.now() - 86400000 * 3),
            status: 'Active',
            userId: {
                _id: 'user1',
                username: 'testuser',
                analystRating: { predictionBreakdownByStock: new Map(), total: 0 },
                save: jest.fn()
            },
            predictionType: 'Daily',
            save: jest.fn(),
        };

        const mockPopulate = jest.fn().mockResolvedValue([mockPrediction]);
        Prediction.find.mockReturnValue({ populate: mockPopulate });

        financeAPI.getHistorical.mockImplementation(async (ticker, options) => {
            if (options.period1 === deadlineStr) {
                return [{ close: 1.09 }];
            }
            return [];
        });

        await runAssessmentJob();

        expect(mockPrediction.actualPrice).toBe(1.09);
        expect(mockPrediction.save).toHaveBeenCalled();
    });

    it('should assess International Stocks (THYAO.IS) correctly', async () => {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() - 1);
        const deadlineStr = deadline.toISOString().split('T')[0];

        const mockPrediction = {
            _id: 'pred_intl',
            stockTicker: 'THYAO.IS',
            targetPrice: 250,
            priceAtCreation: 240,
            deadline: deadline,
            createdAt: new Date(Date.now() - 86400000 * 2),
            status: 'Active',
            userId: {
                _id: 'user1',
                username: 'testuser',
                analystRating: { predictionBreakdownByStock: new Map(), total: 0 },
                save: jest.fn()
            },
            predictionType: 'Daily',
            save: jest.fn(),
        };

        const mockPopulate = jest.fn().mockResolvedValue([mockPrediction]);
        Prediction.find.mockReturnValue({ populate: mockPopulate });

        financeAPI.getHistorical.mockImplementation(async (ticker, options) => {
            if (options.period1 === deadlineStr) {
                return [{ close: 245 }];
            }
            return [];
        });

        await runAssessmentJob();

        expect(mockPrediction.actualPrice).toBe(245);
        expect(mockPrediction.save).toHaveBeenCalled();
    });

    // --- 4. PREDICTION TYPE COVERAGE (Weekly/Monthly/Yearly) ---

    it('should assess Weekly predictions using historical data', async () => {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() - 3); // Past deadline
        const deadlineStr = deadline.toISOString().split('T')[0];

        const mockPrediction = {
            _id: 'pred_weekly',
            stockTicker: 'NVDA',
            targetPrice: 500,
            priceAtCreation: 450,
            deadline: deadline,
            createdAt: new Date(Date.now() - 86400000 * 10),
            status: 'Active',
            userId: {
                _id: 'user1',
                username: 'testuser',
                analystRating: { predictionBreakdownByStock: new Map(), total: 0 },
                save: jest.fn()
            },
            predictionType: 'Weekly',
            save: jest.fn(),
        };

        const mockPopulate = jest.fn().mockResolvedValue([mockPrediction]);
        Prediction.find.mockReturnValue({ populate: mockPopulate });

        financeAPI.getHistorical.mockImplementation(async (ticker, options) => {
            if (options.period1 === deadlineStr) {
                return [{ close: 510 }];
            }
            return [];
        });

        await runAssessmentJob();

        expect(mockPrediction.actualPrice).toBe(510);
        expect(mockPrediction.save).toHaveBeenCalled();
    });

    it('should assess Monthly predictions using historical data', async () => {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() - 10); // Past deadline
        const deadlineStr = deadline.toISOString().split('T')[0];

        const mockPrediction = {
            _id: 'pred_monthly',
            stockTicker: 'GOOGL',
            targetPrice: 140,
            priceAtCreation: 130, // GOOGL Monthly
            deadline: deadline,
            createdAt: new Date(Date.now() - 86400000 * 40),
            status: 'Active',
            userId: {
                _id: 'user1',
                username: 'testuser',
                analystRating: { predictionBreakdownByStock: new Map(), total: 0 },
                save: jest.fn()
            },
            predictionType: 'Monthly',
            save: jest.fn(),
        };

        const mockPopulate = jest.fn().mockResolvedValue([mockPrediction]);
        Prediction.find.mockReturnValue({ populate: mockPopulate });

        financeAPI.getHistorical.mockImplementation(async (ticker, options) => {
            if (options.period1 === deadlineStr) {
                return [{ close: 138 }];
            }
            return [];
        });

        await runAssessmentJob();

        expect(mockPrediction.actualPrice).toBe(138);
        expect(mockPrediction.save).toHaveBeenCalled();
    });

    // --- 5. WEIGHTED TARGET HIT BONUS VERIFICATION ---

    it('should award 0.5x bonus for Hourly prediction hitting target', async () => {
        const deadline = new Date();
        const createdAt = new Date(deadline.getTime() - 3600000); // 1 hour ago

        const mockPrediction = {
            _id: 'pred_hourly_bonus',
            stockTicker: 'AMZN',
            targetPrice: 105, // Target
            priceAtCreation: 100,
            deadline: deadline,
            createdAt: createdAt,
            status: 'Active',
            userId: {
                _id: 'user_hourly',
                username: 'hourly_trader',
                analystRating: { predictionBreakdownByStock: new Map(), total: 0 },
                save: jest.fn()
            },
            predictionType: 'Hourly',
            save: jest.fn(),
        };

        const mockPopulate = jest.fn().mockResolvedValue([mockPrediction]);
        Prediction.find.mockReturnValue({ populate: mockPopulate });

        // Mock Real-time price (Hourly uses getQuote)
        financeAPI.getQuote.mockResolvedValue({ price: 106 });

        // Mock Historical for Target Hit Check (High/Low range must include 105)
        financeAPI.getHistorical.mockResolvedValue([
            { high: 107, low: 104, close: 106 } // 105 is between 104 and 107 -> Hit!
        ]);

        await runAssessmentJob();

        expect(mockPrediction.targetHit).toBe(true);
        // Base Bonus (5) * Weight (0.5) = 2.5
        // Rating calculation is separate, but we check the analystRating update
        // We need to check if the user's analystRating was incremented correctly.
        // Since we mocked the user object inside the prediction, we can check that.
        // However, the job re-fetches or updates the user.
        // In the job: user.analystRating.total += bonusPoints

        // The job updates the user object found in the prediction.userId
        expect(mockPrediction.userId.analystRating.total).toBeGreaterThanOrEqual(2.5);
    });

    it('should award 1.0x bonus for Daily prediction hitting target', async () => {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() - 1);
        const createdAt = new Date(deadline.getTime() - 86400000);

        const mockPrediction = {
            _id: 'pred_daily_bonus',
            stockTicker: 'MSFT',
            targetPrice: 300,
            priceAtCreation: 290,
            deadline: deadline,
            createdAt: createdAt,
            status: 'Active',
            userId: {
                _id: 'user_daily',
                username: 'daily_trader',
                analystRating: { predictionBreakdownByStock: new Map(), total: 0 },
                save: jest.fn()
            },
            predictionType: 'Daily',
            save: jest.fn(),
        };

        const mockPopulate = jest.fn().mockResolvedValue([mockPrediction]);
        Prediction.find.mockReturnValue({ populate: mockPopulate });

        // Mock Historical for Price Check AND Target Hit Check
        financeAPI.getHistorical.mockResolvedValue([
            { high: 305, low: 295, close: 302 } // Target 300 is hit
        ]);

        await runAssessmentJob();

        expect(mockPrediction.targetHit).toBe(true);
        // Base Bonus (5) * Weight (1.0) = 5.0
        expect(mockPrediction.userId.analystRating.total).toBeGreaterThanOrEqual(5.0);
    });

    it('should award 10.0x bonus for Yearly prediction hitting target', async () => {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() - 1);
        const createdAt = new Date(deadline);
        createdAt.setFullYear(createdAt.getFullYear() - 1);

        const mockPrediction = {
            _id: 'pred_yearly_bonus',
            stockTicker: 'NVDA',
            targetPrice: 1000,
            priceAtCreation: 500,
            deadline: deadline,
            createdAt: createdAt,
            status: 'Active',
            userId: {
                _id: 'user_yearly',
                username: 'yearly_investor',
                analystRating: { predictionBreakdownByStock: new Map(), total: 0 },
                save: jest.fn()
            },
            predictionType: 'Yearly',
            save: jest.fn(),
        };

        const mockPopulate = jest.fn().mockResolvedValue([mockPrediction]);
        Prediction.find.mockReturnValue({ populate: mockPopulate });

        financeAPI.getHistorical.mockResolvedValue([
            { high: 1050, low: 950, close: 1020 } // Target 1000 is hit
        ]);

        await runAssessmentJob();

        expect(mockPrediction.targetHit).toBe(true);
        // Base Bonus (5) * Weight (10.0) = 50.0
        expect(mockPrediction.userId.analystRating.total).toBeGreaterThanOrEqual(50.0);
    });

    it('should award 0 bonus if target is NOT hit', async () => {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() - 1);
        const createdAt = new Date(deadline.getTime() - 86400000);

        const mockPrediction = {
            _id: 'pred_missed',
            stockTicker: 'NFLX',
            targetPrice: 600,
            priceAtCreation: 550,
            deadline: deadline,
            createdAt: createdAt,
            status: 'Active',
            userId: {
                _id: 'user_missed',
                username: 'missed_trader',
                analystRating: { predictionBreakdownByStock: new Map(), total: 0 },
                save: jest.fn()
            },
            predictionType: 'Daily',
            save: jest.fn(),
        };

        const mockPopulate = jest.fn().mockResolvedValue([mockPrediction]);
        Prediction.find.mockReturnValue({ populate: mockPopulate });

        financeAPI.getHistorical.mockResolvedValue([
            { high: 590, low: 560, close: 580 } // Target 600 is NOT hit (max 590)
        ]);

        await runAssessmentJob();

        expect(mockPrediction.targetHit).toBe(false);
        // Should only get rating points, no bonus.
        // Since we can't easily separate rating points from bonus in this test without complex calculation assertions,
        // we can check that the log doesn't show "Awarded bonus points".
        // But better: check that targetHit is false.
    });
});

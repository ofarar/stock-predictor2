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
            status: 'Active',
            userId: { _id: 'user1', username: 'testuser' },
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
            status: 'Active',
            userId: { _id: 'user1', username: 'testuser' },
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
            status: 'Active',
            userId: { _id: 'user1', username: 'testuser' },
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
            status: 'Active',
            userId: { _id: 'user1', username: 'testuser' },
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
            status: 'Active',
            userId: { _id: 'user1', username: 'testuser' },
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
            status: 'Active',
            userId: { _id: 'user1', username: 'testuser' },
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
            priceAtCreation: 130,
            deadline: deadline,
            status: 'Active',
            userId: { _id: 'user1', username: 'testuser' },
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
});

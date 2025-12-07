const request = require('supertest');
const express = require('express');
const adminRouter = require('../routes/admin');
const Prediction = require('../models/Prediction');
const User = require('../models/User');

// Mock Mongoose Models
jest.mock('../models/Prediction');
jest.mock('../models/User');

// Mock other dependencies used in admin.js
jest.mock('../services/badgeService', () => ({
    awardBadges: jest.fn()
}));
jest.mock('../services/email', () => ({
    transporter: { verify: jest.fn() }
}));
jest.mock('../services/financeAPI', () => ({
    getApiCallStats: jest.fn()
}));
// Mock the scheduler/job imports to prevent side effects
jest.mock('../jobs/assessment-job', () => jest.fn());
jest.mock('../jobs/botScheduler', () => ({
    runEarningsModel: jest.fn()
}));

describe('Bot Governance API', () => {
    let app;

    beforeAll(() => {
        app = express();
        app.use(express.json());

        // Mock Authentication Middleware (simulate Admin)
        app.use((req, res, next) => {
            req.user = { _id: 'admin_id', email: 'admin@test.com', isAdmin: true };
            next();
        });

        app.use('/api', adminRouter);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/admin/predictions/pending', () => {
        it('should return a list of pending predictions', async () => {
            const mockPredictions = [
                { _id: 'pred1', stockTicker: 'NVDA', status: 'Pending' },
                { _id: 'pred2', stockTicker: 'AMD', status: 'Pending' }
            ];

            // Mock Mongoose chain: find().populate().sort()
            const mockSort = jest.fn().mockResolvedValue(mockPredictions);
            const mockPopulate = jest.fn().mockReturnValue({ sort: mockSort });
            Prediction.find.mockReturnValue({ populate: mockPopulate });

            const res = await request(app).get('/api/admin/predictions/pending');

            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(2);
            expect(res.body[0].stockTicker).toBe('NVDA');
            expect(Prediction.find).toHaveBeenCalledWith({ status: 'Pending' });
        });

        it('should handle errors gracefully', async () => {
            Prediction.find.mockImplementation(() => { throw new Error('DB Error'); });

            const res = await request(app).get('/api/admin/predictions/pending');

            expect(res.statusCode).toBe(500);
            expect(res.body.message).toBe('Error fetching pending predictions.');
        });
    });

    describe('PUT /api/admin/predictions/:id/status', () => {
        it('should approve a prediction (set status to Active)', async () => {
            const mockUpdatedPrediction = { _id: 'pred1', status: 'Active' };
            Prediction.findByIdAndUpdate.mockResolvedValue(mockUpdatedPrediction);

            const res = await request(app)
                .put('/api/admin/predictions/pred1/status')
                .send({ status: 'Active' });

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('Active');
            expect(Prediction.findByIdAndUpdate).toHaveBeenCalledWith(
                'pred1',
                { status: 'Active' },
                { new: true }
            );
        });

        it('should reject a prediction (set status to Rejected)', async () => {
            const mockUpdatedPrediction = { _id: 'pred1', status: 'Rejected' };
            Prediction.findByIdAndUpdate.mockResolvedValue(mockUpdatedPrediction);

            const res = await request(app)
                .put('/api/admin/predictions/pred1/status')
                .send({ status: 'Rejected' });

            expect(res.statusCode).toBe(200);
            expect(res.body.status).toBe('Rejected');
        });

        it('should reject invalid status updates', async () => {
            const res = await request(app)
                .put('/api/admin/predictions/pred1/status')
                .send({ status: 'InvalidStatus' });

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Invalid status update.');
            expect(Prediction.findByIdAndUpdate).not.toHaveBeenCalled();
        });
    });
});

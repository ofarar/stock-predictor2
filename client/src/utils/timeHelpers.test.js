
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPredictionDetails } from './timeHelpers';
import { DateTime } from 'luxon';

// Mock translations
const t = (key, params) => {
    if (key === 'predictionWidgetMessages.maxRating') return `Max Rating: ${params.rating}`;
    if (key === 'predictionWidgetMessages.forDate') return `Prediction for ${params.date}`;
    if (key === 'predictionWidgetMessages.marketClosed') return 'Market Closed';
    return key;
};
const i18n = { language: 'en-US' };

describe('timeHelpers', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('getPredictionDetails (Daily)', () => {
        it('should apply penalty during market hours', () => {
            // Monday, 10:00 AM NY time (Market Open)
            const mockNow = DateTime.fromObject({ year: 2023, month: 10, day: 23, hour: 10, minute: 0 }, { zone: 'America/New_York' });
            vi.setSystemTime(mockNow.toJSDate());

            const stock = { symbol: 'AAPL', marketState: 'REGULAR' };
            const result = getPredictionDetails('Daily', t, i18n, stock);

            expect(result.isOpen).toBe(true);
            expect(result.message).toContain('Max Rating');
            // 30 mins elapsed (9:30 to 10:00). Total day is 6.5 hours (390 mins).
            // Penalty = 30 / (390/20) = 30 / 19.5 = 1.53 -> floor(1)
            // Wait, logic is: floor(elapsed / (total / 20))
            // 30 / (390 / 20) = 30 / 19.5 = 1.53 -> 1
            // MaxScore = 100 - 1 = 99
            expect(result.message).toContain('99');
        });

        it('should NOT apply penalty if market is CLOSED on a weekday (e.g. Holiday)', () => {
            // Monday, 10:00 AM NY time (But Market is CLOSED)
            const mockNow = DateTime.fromObject({ year: 2023, month: 12, day: 25, hour: 10, minute: 0 }, { zone: 'America/New_York' }); // Christmas
            vi.setSystemTime(mockNow.toJSDate());

            const stock = { symbol: 'AAPL', marketState: 'CLOSED' };
            const result = getPredictionDetails('Daily', t, i18n, stock);

            // Should target NEXT day, not today.
            // If it targets today, it would calculate penalty based on time.
            // If it targets next day, message should be "Prediction for <Date>"

            // CURRENT BUGGY BEHAVIOR: It thinks it's open because it's a weekday morning.
            // EXPECTED FIX BEHAVIOR: It sees marketState is CLOSED, so it targets next day.

            // We expect the result to be for a future date, not today.
            const todayStr = mockNow.toFormat('MMM d, yyyy');
            expect(result.message).not.toContain('Max Rating');
            expect(result.message).toContain('Prediction for');
        });

        it('should NOT apply penalty if market closes EARLY (Half-Day)', () => {
            // Friday after Thanksgiving, 2:00 PM NY time (Market closed at 1:00 PM)
            const mockNow = DateTime.fromObject({ year: 2023, month: 11, day: 24, hour: 14, minute: 0 }, { zone: 'America/New_York' });
            vi.setSystemTime(mockNow.toJSDate());

            const stock = { symbol: 'AAPL', marketState: 'CLOSED' };
            const result = getPredictionDetails('Daily', t, i18n, stock);

            // Should target NEXT day (Monday).
            expect(result.message).not.toContain('Max Rating');
            expect(result.message).toContain('Prediction for');
        });

        it('should target next day on weekends', () => {
            // Saturday
            const mockNow = DateTime.fromObject({ year: 2023, month: 10, day: 21, hour: 12, minute: 0 }, { zone: 'America/New_York' });
            vi.setSystemTime(mockNow.toJSDate());

            const stock = { symbol: 'AAPL', marketState: 'CLOSED' };
            const result = getPredictionDetails('Daily', t, i18n, stock);

            expect(result.message).toContain('Prediction for');
        });

        it('should allow Crypto predictions on weekends (24/7)', () => {
            // Saturday, 12:00 PM UTC
            const mockNow = DateTime.fromObject({ year: 2023, month: 10, day: 21, hour: 12, minute: 0 }, { zone: 'UTC' });
            vi.setSystemTime(mockNow.toJSDate());

            // Crypto usually has marketState 'REGULAR' even on weekends, but let's test both with and without
            const stock = { symbol: 'BTC-USD', marketState: 'REGULAR' };
            const result = getPredictionDetails('Daily', t, i18n, stock);

            expect(result.isOpen).toBe(true);
            expect(result.message).toContain('Max Rating');
        });

        it('should allow Crypto predictions on weekends even if marketState is missing (Fallback)', () => {
            // Saturday, 12:00 PM UTC
            const mockNow = DateTime.fromObject({ year: 2023, month: 10, day: 21, hour: 12, minute: 0 }, { zone: 'UTC' });
            vi.setSystemTime(mockNow.toJSDate());

            const stock = { symbol: 'BTC-USD', marketState: null }; // Missing state
            const result = getPredictionDetails('Daily', t, i18n, stock);

            // This verifies the fallback logic for 24/7 assets
            expect(result.isOpen).toBe(true);
            expect(result.message).toContain('Max Rating');
        });

        it('should handle International Markets (e.g. Turkey) correctly', () => {
            // Wednesday, 2:00 PM Istanbul time (Open)
            // Istanbul is UTC+3. 2:00 PM = 14:00.
            const mockNow = DateTime.fromObject({ year: 2023, month: 10, day: 25, hour: 14, minute: 0 }, { zone: 'Europe/Istanbul' });
            vi.setSystemTime(mockNow.toJSDate());

            const stock = { symbol: 'THYAO.IS', marketState: 'REGULAR' };
            const result = getPredictionDetails('Daily', t, i18n, stock);

            expect(result.isOpen).toBe(true);
            expect(result.message).toContain('Max Rating');
        });
    });
});

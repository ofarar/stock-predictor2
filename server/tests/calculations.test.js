const { calculateProximityRating, calculateAggressiveness } = require('../utils/calculations');

describe('Calculation Logic Tests', () => {

    describe('calculateProximityRating', () => {
        // Test Case 1: Perfect Prediction
        test('should return max rating (100) for perfect prediction', () => {
            const rating = calculateProximityRating(150, 150, 140);
            expect(rating).toBe(100);
        });

        // Test Case 2: Within Error Margin
        test('should return a high rating for small error', () => {
            // Target: 150, Actual: 149. Error: 1. Error%: 1/149 = 0.0067. MaxError: 0.05
            // Rating = 100 * (1 - 0.0067/0.05) = 100 * (1 - 0.134) = 86.6
            const rating = calculateProximityRating(150, 149, 140);
            expect(rating).toBeGreaterThan(80);
            expect(rating).toBeLessThan(100);
        });

        // Test Case 3: Exceeding Error Margin
        test('should return 0 if error exceeds max percentage', () => {
            // Target: 150, Actual: 100. Error: 50. Error%: 0.5 > 0.05
            const rating = calculateProximityRating(150, 100, 140);
            expect(rating).toBe(0);
        });

        // Test Case 4: Wrong Direction
        test('should return 0 for wrong direction', () => {
            // PriceAtCreation: 100. Target: 110 (Up). Actual: 90 (Down).
            const rating = calculateProximityRating(110, 90, 100);
            expect(rating).toBe(0);
        });

        // Test Case 5: Correct Direction but large error
        test('should return 0 for correct direction but large error', () => {
            // PriceAtCreation: 100. Target: 110 (Up). Actual: 150 (Up). Error: 40. Error%: 40/150 = 0.26 > 0.05
            const rating = calculateProximityRating(110, 150, 100);
            expect(rating).toBe(0);
        });
    });

    describe('calculateAggressiveness', () => {
        const mockPredictions = [
            { predictionType: 'Weekly', targetPrice: 105, priceAtCreation: 100 }, // +5% (Defensive <= 5)
            { predictionType: 'Weekly', targetPrice: 110, priceAtCreation: 100 }, // +10% (Neutral <= 10)
            { predictionType: 'Weekly', targetPrice: 120, priceAtCreation: 100 }, // +20% (Offensive > 10)
        ];

        test('should correctly categorize predictions', () => {
            const result = calculateAggressiveness(mockPredictions);
            expect(result.distribution.defensive).toBe(1);
            expect(result.distribution.neutral).toBe(1);
            expect(result.distribution.offensive).toBe(1);
            expect(result.analyzedCount).toBe(3);
        });

        test('should calculate overall score correctly', () => {
            // Changes: 5%, 10%, 20%. Avg: 35/3 = 11.66 -> 11.7
            const result = calculateAggressiveness(mockPredictions);
            expect(result.overallScore).toBe(11.7);
        });

        test('should handle empty predictions', () => {
            const result = calculateAggressiveness([]);
            expect(result.distribution.defensive).toBe(0);
            expect(result.overallScore).toBe(0);
            expect(result.analyzedCount).toBe(0);
        });
    });
});

describe('calculateDirectionAccuracy', () => {
    const { calculateDirectionAccuracy } = require('../utils/calculations');

    test('should calculate accuracy correctly', () => {
        const predictions = [
            { status: 'Assessed', priceAtCreation: 100, targetPrice: 110, actualPrice: 105 }, // Up/Up (Correct)
            { status: 'Assessed', priceAtCreation: 100, targetPrice: 110, actualPrice: 95 },  // Up/Down (Wrong)
            { status: 'Assessed', priceAtCreation: 100, targetPrice: 90, actualPrice: 80 },   // Down/Down (Correct)
            { status: 'Assessed', priceAtCreation: 100, targetPrice: 90, actualPrice: 110 },  // Down/Up (Wrong)
        ];
        const result = calculateDirectionAccuracy(predictions);
        // 2 correct out of 4 -> 50%
        expect(result.accuracy).toBe(50);
        expect(result.correct).toBe(2);
        expect(result.total).toBe(4);
    });

    test('should handle empty or invalid inputs', () => {
        const result = calculateDirectionAccuracy([]);
        expect(result.accuracy).toBe(0);
        expect(result.total).toBe(0);
    });

    test('should ignore non-assessed items', () => {
        const predictions = [
            { status: 'Active', priceAtCreation: 100, targetPrice: 110, actualPrice: 0 },
            { status: 'Assessed', priceAtCreation: 100, targetPrice: 110, actualPrice: 120 } // Correct
        ];
        const result = calculateDirectionAccuracy(predictions);
        expect(result.accuracy).toBe(100);
        expect(result.total).toBe(1);
    });
});


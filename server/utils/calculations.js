const { PREDICTION_MAX_RATING, PREDICTION_MAX_ERROR_PERCENTAGE } = require('../constants');

/**
 * Calculates a rating based on how close a prediction was to the actual price.
 * @param {number} predictedPrice - The target price predicted by the user.
 * @param {number} actualPrice - The actual price of the stock at the deadline.
 * @param {number} priceAtCreation - The price of the stock when the prediction was created.
 * @returns {number} The calculated rating (0-100).
 */
function calculateProximityRating(predictedPrice, actualPrice, priceAtCreation) {
    // --- Direction Check ---
    if (typeof priceAtCreation === 'number' && priceAtCreation > 0) {
        const predictedDirection = predictedPrice - priceAtCreation;
        const actualDirection = actualPrice - priceAtCreation;
        // If directions are opposite (one positive, one negative), rating is 0
        if (predictedDirection * actualDirection < 0) {
            return 0;
        }
    }
    // --- End Direction Check ---

    const MAX_RATING = PREDICTION_MAX_RATING || 100;
    const MAX_ERROR_PERCENTAGE = PREDICTION_MAX_ERROR_PERCENTAGE || 0.05; // Default 5%

    if (actualPrice === 0) return 0;

    const error = Math.abs(predictedPrice - actualPrice);
    const errorPercentage = error / actualPrice;

    if (errorPercentage > MAX_ERROR_PERCENTAGE) {
        return 0;
    }

    const rating = MAX_RATING * (1 - (errorPercentage / MAX_ERROR_PERCENTAGE));
    return parseFloat(rating.toFixed(1));
}

/**
 * Calculates the aggressiveness score based on prediction changes.
 * @param {Array} predictions - List of assessed predictions.
 * @returns {Object} Aggressiveness stats { distribution, overallScore, analyzedCount }.
 */
function calculateAggressiveness(predictions) {
    const thresholds = {
        Hourly: { def: 1, neu: 3 },
        Daily: { def: 3, neu: 7 },
        Weekly: { def: 5, neu: 10 },
        Monthly: { def: 8, neu: 20 },
        Quarterly: { def: 10, neu: 25 },
        Yearly: { def: 15, neu: 35 }
    };

    const distribution = { defensive: 0, neutral: 0, offensive: 0 };
    let totalAbsoluteChange = 0;
    let analyzedCount = 0;

    predictions.forEach(p => {
        if (p.priceAtCreation > 0) {
            analyzedCount++;
            const absoluteChange = Math.abs((p.targetPrice - p.priceAtCreation) / p.priceAtCreation) * 100;
            totalAbsoluteChange += absoluteChange;

            const typeThresholds = thresholds[p.predictionType] || { def: 5, neu: 15 };

            if (absoluteChange <= typeThresholds.def) {
                distribution.defensive++;
            } else if (absoluteChange <= typeThresholds.neu) {
                distribution.neutral++;
            } else {
                distribution.offensive++;
            }
        }
    });

    const overallScore = analyzedCount > 0 ? totalAbsoluteChange / analyzedCount : 0;

    return {
        distribution,
        overallScore: parseFloat(overallScore.toFixed(1)),
        analyzedCount
    };
}

module.exports = {
    calculateProximityRating,
    calculateAggressiveness
};

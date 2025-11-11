const Prediction = require('../models/Prediction');

/**
 * Calculates the community sentiment for a given stock ticker by aggregating active predictions.
 * @param {string} ticker The stock ticker symbol (e.g., 'AAPL').
 * @returns {Promise<Object>} A promise that resolves to an object containing sentiment data,
 * keyed by prediction type (e.g., { Daily: { averageTarget: 150, predictionCount: 10 } }).
 */
const getCommunitySentiment = async (ticker) => {
    try {
        const sentimentData = await Prediction.aggregate([
            // Stage 1: Find all 'Active' predictions for the specified stock ticker.
            {
                $match: {
                    stockTicker: ticker,
                    status: 'Active'
                }
            },
            // Stage 2: Group the documents by their 'predictionType'.
            {
                $group: {
                    _id: '$predictionType', // Group by the prediction type (e.g., 'Daily', 'Weekly')
                    avgTarget: { $avg: '$targetPrice' }, // Calculate the average of 'targetPrice' for each group
                    predictionCount: { $sum: 1 } // Count the number of predictions in each group
                }
            },
            // Stage 3: Reshape the output documents.
            {
                $project: {
                    _id: 0, // Exclude the default _id field
                    predictionType: '$_id', // Rename _id to predictionType
                    averageTarget: '$avgTarget',
                    predictionCount: '$predictionCount'
                }
            }
        ]);

        // Convert the array of results into a more convenient object map.
        // e.g., from [{ predictionType: 'Daily', ... }] to { Daily: { ... } }
        const sentimentMap = sentimentData.reduce((acc, sentiment) => {
            acc[sentiment.predictionType] = {
                averageTarget: sentiment.averageTarget,
                predictionCount: sentiment.predictionCount
            };
            return acc;
        }, {});

        return sentimentMap;
    } catch (error) {
        console.error(`Error calculating community sentiment for ${ticker}:`, error);
        // Return an empty object in case of an error to prevent crashes downstream.
        return {};
    }
};

module.exports = { getCommunitySentiment };
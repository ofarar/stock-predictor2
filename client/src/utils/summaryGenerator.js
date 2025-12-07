export const generateSmartSummary = (user, performance, predictions, t) => {
    // Fallback if t is not provided (though it should be)
    const translate = t || ((key, params) => {
        // Very basic fallback if needed, or just return empty to fail gracefully during dev
        return key;
    });

    if (!user || !performance) return translate('summary.default_intro');

    const parts = [];
    const { overallAvgRating, overallRank, aggressiveness } = performance;
    const totalPredictions = predictions ? predictions.length : 0;

    // Filter assessed predictions for analysis
    const assessedPredictions = predictions ? predictions.filter(p => p.status === 'Assessed') : [];

    // 1. INTRO / EXPERIENCE LEVEL
    const joinedYear = new Date(user.createdAt).getFullYear();

    if (totalPredictions > 50) {
        parts.push(translate('summary.veteran', { year: joinedYear }));
    } else if (totalPredictions > 10) {
        parts.push(translate('summary.active_trader', { year: joinedYear }));
    } else {
        parts.push(translate('summary.rising_star', { year: joinedYear }));
    }

    // 2. PERFORMANCE HIGHLIGHTS
    if (overallRank && overallRank <= 3) {
        parts.push(translate('summary.top_rank', { rank: overallRank }));
    } else if (overallRank && overallRank <= 100) {
        parts.push(translate('summary.top_100'));
    }

    if (overallAvgRating >= 80) {
        parts.push(translate('summary.high_accuracy', { rating: overallAvgRating.toFixed(1) }));
    } else if (overallAvgRating >= 60) {
        parts.push(translate('summary.solid_history', { rating: overallAvgRating.toFixed(1) }));
    }

    // 3. STOCK SPECIFIC SUPERPOWERS (New)
    if (assessedPredictions.length > 0) {
        const stockStats = {};
        assessedPredictions.forEach(p => {
            if (!stockStats[p.stockTicker]) {
                stockStats[p.stockTicker] = { totalRating: 0, count: 0 };
            }
            stockStats[p.stockTicker].totalRating += (p.rating || 0);
            stockStats[p.stockTicker].count += 1;
        });

        // Find stocks with > 85 average rating and at least 2 predictions
        const bestStocks = Object.entries(stockStats)
            .filter(([_, stats]) => stats.count >= 2 && (stats.totalRating / stats.count) >= 85)
            .map(([ticker]) => `$${ticker}`); // Added $ prefix

        if (bestStocks.length > 0) {
            const stockList = bestStocks.slice(0, 3).join(", "); // Top 3
            parts.push(translate('summary.stock_superpowers', { stocks: stockList }));
        }
    }

    // 4. PREDICTION TYPE EXPERTISE (New)
    if (assessedPredictions.length > 0) {
        const typeStats = {};
        assessedPredictions.forEach(p => {
            if (!typeStats[p.predictionType]) {
                typeStats[p.predictionType] = { totalRating: 0, count: 0 };
            }
            typeStats[p.predictionType].totalRating += (p.rating || 0);
            typeStats[p.predictionType].count += 1;
        });

        // Determine best horizon
        let bestType = null;
        let bestTypeRating = -1;

        Object.entries(typeStats).forEach(([type, stats]) => {
            if (stats.count >= 2) { // Minimum threshold
                const avg = stats.totalRating / stats.count;
                if (avg > bestTypeRating && avg >= 70) { // Must be decent rating
                    bestTypeRating = avg;
                    bestType = type;
                }
            }
        });

        if (bestType) {
            const isShortTerm = ['Hourly', 'Daily', 'Weekly'].includes(bestType);
            const isLongTerm = ['Monthly', 'Quarterly', 'Yearly'].includes(bestType);

            if (isShortTerm) {
                parts.push(translate('summary.expert_short_term'));
            } else if (isLongTerm) {
                parts.push(translate('summary.expert_long_term'));
            }
        }
    }

    // 5. TRADING STYLE
    if (aggressiveness) {
        const { high, medium, low } = aggressiveness.distribution || {};
        if (high > medium && high > low) {
            parts.push(translate('summary.style_aggressive'));
        } else if (low > medium && low > high) {
            parts.push(translate('summary.style_conservative'));
        } else {
            parts.push(translate('summary.style_balanced'));
        }
    }

    // 6. ACHIEVEMENTS
    const fanBase = user.followers ? user.followers.length : 0;
    if (fanBase > 100) {
        parts.push(translate('summary.influencer', { count: fanBase }));
    } else if (fanBase > 10) {
        parts.push(translate('summary.community_builder', { count: fanBase }));
    }

    if (user.isGoldenMember) {
        parts.push(translate('summary.golden_member'));
    }

    // 7. CLOSING
    if (parts.length === 0) {
        return [translate('summary.new_trader')];
    }

    return parts;
};

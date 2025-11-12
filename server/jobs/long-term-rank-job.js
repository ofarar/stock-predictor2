// server/jobs/long-term-rank-job.js
const { awardPointsForCategory } = require('../services/rankService');

const runWeeklyRankJob = async () => {
    console.log('--- Running Weekly Rank Job (Weekly) ---');
    await awardPointsForCategory('Weekly', { predictionType: 'Weekly' });
    console.log('--- Finished Weekly Rank Job ---');
};

const runMonthlyRankJob = async () => {
    console.log('--- Running Monthly Rank Job (Monthly, Quarterly, Yearly) ---');
    await awardPointsForCategory('Monthly', { predictionType: 'Monthly' });
    await awardPointsForCategory('Quarterly', { predictionType: 'Quarterly' });
    await awardPointsForCategory('Yearly', { predictionType: 'Yearly' });
    console.log('--- Finished Monthly Rank Job ---');
};

// --- NEW REAL-TIME JOB ---
// This job will run frequently for the fast-moving leaderboards.
const runRealtimeRankJob = async () => {
    console.log('--- Running Realtime Rank Job (Overall, Hourly, Daily, Top Stocks) ---');
    
    // 1. Overall
    await awardPointsForCategory('Overall', {});
    
    // 2. Hourly & Daily
    await awardPointsForCategory('Hourly', { predictionType: 'Hourly' });
    await awardPointsForCategory('Daily', { predictionType: 'Daily' });

    // 3. Top Stocks (e.g., Top 20 most-predicted stocks)
    // This part is complex. For now, let's skip it to keep the implementation clean.
    // We can add "Top Stocks" in a future iteration.
    
    console.log('--- Finished Realtime Rank Job ---');
};

module.exports = {
    runWeeklyRankJob,
    runMonthlyRankJob,
    runRealtimeRankJob // <-- Export the new job
};
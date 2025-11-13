// server/jobs/long-term-rank-job.js
const { awardPointsForCategory } = require('../services/rankService');

const runHourlyRankJob = async () => {
    console.log('--- Running Hourly Rank Job ---');
    await awardPointsForCategory('Hourly', { predictionType: 'Hourly' });
    console.log('--- Finished Hourly Rank Job ---');
};

const runDailyRankJob = async () => {
    console.log('--- Running Daily & Overall Rank Job ---');
    await awardPointsForCategory('Daily', { predictionType: 'Daily' });
    await awardPointsForCategory('Overall', {}); // Overall rank is best run daily
    console.log('--- Finished Daily & Overall Rank Job ---');
};

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



module.exports = {
    runHourlyRankJob,
    runDailyRankJob,
    runWeeklyRankJob,
    runMonthlyRankJob,
};
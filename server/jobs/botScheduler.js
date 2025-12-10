const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

// Schedule: Daily at 8:00 AM UTC
// Schedule: Daily at 8:00 AM UTC (Sigma Alpha)
const SCHEDULE_EXPRESSION = '0 8 * * *';

// --- Smart Bot Fleet Schedules ---
const CRON_DAILY = '0 9 * * *';      // 9:00 AM UTC
const CRON_WEEKLY = '0 10 * * 0';    // Sundays 10:00 AM UTC
const CRON_MONTHLY = '0 11 1 * *';   // 1st of Month 11:00 AM UTC
const CRON_QUARTERLY = '0 12 1 */3 *'; // 1st of Quarter 12:00 AM UTC

// --- Job Tracking ---
const activeJobs = {}; // { 'Daily': process, 'SigmaAlpha': process }

const getActiveJobs = () => Object.keys(activeJobs);

const stopJob = (jobId) => {
    const process = activeJobs[jobId];
    if (process) {
        process.kill('SIGINT'); // Try graceful stop first
        delete activeJobs[jobId];
        console.log(`[Scheduler] Manually stopped job: ${jobId}`);
        return true;
    }
    return false;
};

const runSmartBotBatch = (interval = 'Daily', mode = 'inference') => {
    const jobId = interval; // Use interval as ID since we only run one of each at a time
    if (activeJobs[jobId]) {
        console.log(`[Scheduler] Job ${jobId} is already running. Skipping.`);
        return;
    }

    console.log(`--- [Cron] Starting Smart Bot Fleet Batch (${interval}, Mode: ${mode}) ---`);

    const scriptPath = path.join(__dirname, '../ml_service/smart_bot_engine.py');
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

    const pythonProcess = spawn(pythonCommand, ['-u', scriptPath, '--interval', interval, '--mode', mode]);
    activeJobs[jobId] = pythonProcess;

    pythonProcess.stdout.on('data', (data) => {
        console.log(`[SmartEngine]: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`[SmartEngine Err]: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        delete activeJobs[jobId]; // Cleanup on finish
        if (code === 0) {
            console.log(`--- [Cron] Smart Bot Fleet (${interval}) Completed ---`);
        } else {
            console.error(`--- [Cron] Smart Bot Fleet (${interval}) Failed (Code ${code}) ---`);
        }
    });
};

const runEarningsModel = (mode = 'inference') => {
    const jobId = 'SigmaAlpha';
    if (activeJobs[jobId]) {
        console.log(`[Scheduler] Job ${jobId} is already running. Skipping.`);
        return;
    }

    console.log(`--- [Cron] Starting Sigma Alpha Bot Run (Mode: ${mode}) ---`);

    const scriptPath = path.join(__dirname, '../ml_service/earnings_model.py');
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

    const pythonProcess = spawn(pythonCommand, ['-u', scriptPath, '--mode', mode]);
    activeJobs[jobId] = pythonProcess;

    pythonProcess.stdout.on('data', (data) => {
        console.log(`[Bot StdOut]: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`[Bot StdErr]: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        delete activeJobs[jobId];
        if (code === 0) {
            console.log('--- [Cron] Bot Run Completed Successfully ---');
        } else {
            console.error(`--- [Cron] Bot Run Failed with code ${code} ---`);
        }
    });
};

const initBotScheduler = () => {
    if (process.env.NODE_ENV === 'test') return;

    cron.schedule(SCHEDULE_EXPRESSION, () => runEarningsModel(), { scheduled: true, timezone: "UTC" });
    cron.schedule(CRON_DAILY, () => runSmartBotBatch('Daily', 'inference'), { scheduled: true, timezone: "UTC" });
    cron.schedule(CRON_WEEKLY, () => runSmartBotBatch('Weekly', 'inference'), { scheduled: true, timezone: "UTC" });
    cron.schedule(CRON_MONTHLY, () => runSmartBotBatch('Monthly', 'inference'), { scheduled: true, timezone: "UTC" });
    cron.schedule(CRON_QUARTERLY, () => runSmartBotBatch('Quarterly', 'inference'), { scheduled: true, timezone: "UTC" });

    console.log(`[Scheduler] Bot Fleet Automation Active (Daily/Weekly/Monthly/Quarterly)`);
};

module.exports = { initBotScheduler, runEarningsModel, runSmartBotBatch, getActiveJobs, stopJob };

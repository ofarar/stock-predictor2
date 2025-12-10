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

const runSmartBotBatch = (interval = 'Daily', mode = 'inference') => {
    console.log(`--- [Cron] Starting Smart Bot Fleet Batch (${interval}, Mode: ${mode}) ---`);

    const scriptPath = path.join(__dirname, '../ml_service/smart_bot_engine.py');
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

    const pythonProcess = spawn(pythonCommand, ['-u', scriptPath, '--interval', interval, '--mode', mode]);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`[SmartEngine]: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`[SmartEngine Err]: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        if (code === 0) {
            console.log(`--- [Cron] Smart Bot Fleet (${interval}) Completed ---`);
        } else {
            console.error(`--- [Cron] Smart Bot Fleet (${interval}) Failed (Code ${code}) ---`);
        }
    });
};

const runEarningsModel = (mode = 'inference') => {
    console.log(`--- [Cron] Starting Sigma Alpha Bot Run (Mode: ${mode}) ---`);

    // Path to the python script
    // Script is now inside server/ml_service/earnings_model.py
    const scriptPath = path.join(__dirname, '../ml_service/earnings_model.py');

    // Attempt to use 'python3' (Linux/Mac/Docker) or 'python' (Windows)
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

    // Pass mode argument to python script
    const pythonProcess = spawn(pythonCommand, ['-u', scriptPath, '--mode', mode]);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`[Bot StdOut]: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`[Bot StdErr]: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        if (code === 0) {
            console.log('--- [Cron] Bot Run Completed Successfully ---');
        } else {
            console.error(`--- [Cron] Bot Run Failed with code ${code} ---`);
        }
    });
};

const initBotScheduler = () => {
    if (process.env.NODE_ENV === 'test') return; // Skip in tests

    // 1. Sigma Alpha (Daily)
    cron.schedule(SCHEDULE_EXPRESSION, () => {
        runEarningsModel();
    }, { scheduled: true, timezone: "UTC" });

    // 2. Smart Fleet (Daily)
    cron.schedule(CRON_DAILY, () => {
        runSmartBotBatch('Daily', 'inference');
    }, { scheduled: true, timezone: "UTC" });

    // 3. Smart Fleet (Weekly)
    cron.schedule(CRON_WEEKLY, () => {
        runSmartBotBatch('Weekly', 'inference');
    }, { scheduled: true, timezone: "UTC" });

    // 4. Smart Fleet (Monthly)
    cron.schedule(CRON_MONTHLY, () => {
        runSmartBotBatch('Monthly', 'inference');
    }, { scheduled: true, timezone: "UTC" });

    // 5. Smart Fleet (Quarterly)
    cron.schedule(CRON_QUARTERLY, () => {
        runSmartBotBatch('Quarterly', 'inference');
    }, { scheduled: true, timezone: "UTC" });

    console.log(`[Scheduler] Bot Fleet Automation Active (Daily/Weekly/Monthly/Quarterly)`);
};

module.exports = { initBotScheduler, runEarningsModel, runSmartBotBatch };

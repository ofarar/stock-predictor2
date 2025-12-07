const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

// Schedule: Daily at 8:00 AM UTC
const SCHEDULE_EXPRESSION = '0 8 * * *';

const runEarningsModel = (mode = 'inference') => {
    console.log(`--- [Cron] Starting Sigma Alpha Bot Run (Mode: ${mode}) ---`);

    // Path to the python script
    // Script is now inside server/ml_service/earnings_model.py
    const scriptPath = path.join(__dirname, '../ml_service/earnings_model.py');

    // Attempt to use 'python3' (Linux/Mac/Docker) or 'python' (Windows)
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

    // Pass mode argument to python script
    const pythonProcess = spawn(pythonCommand, [scriptPath, '--mode', mode]);

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

    // Start the cron job
    cron.schedule(SCHEDULE_EXPRESSION, () => {
        runEarningsModel();
    }, {
        scheduled: true,
        timezone: "UTC"
    });

    console.log(`[Scheduler] Sigma Alpha Bot scheduled for ${SCHEDULE_EXPRESSION} UTC`);
};

module.exports = { initBotScheduler, runEarningsModel };

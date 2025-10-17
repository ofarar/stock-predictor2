const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const JobLogSchema = new Schema({
    jobId: { type: String, required: true, unique: true, index: true },
    lastAttemptedRun: { type: Date, default: Date.now },
});

module.exports = mongoose.model('JobLog', JobLogSchema);
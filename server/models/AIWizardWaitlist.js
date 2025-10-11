const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AIWizardWaitlistSchema = new Schema({
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        unique: true // A user can only join the waitlist once
    },
}, { timestamps: true });

module.exports = mongoose.model('AIWizardWaitlist', AIWizardWaitlistSchema);
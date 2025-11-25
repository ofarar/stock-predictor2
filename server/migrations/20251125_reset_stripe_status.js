// === FIX: ADD THIS LINE TO LOAD .env FILE ===
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
// ===========================================

const mongoose = require('mongoose');
const User = require('../models/User');
// Note: You must manually ensure this variable is set in your .env file
// The variable is process.env.MONGO_URI 

async function resetStripeStatus() {
    console.log('--- Starting Stripe Status Reset for All Users ---');

    if (!process.env.MONGO_URI) {
        console.error("CRITICAL ERROR: MONGO_URI is undefined. Cannot connect to database.");
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connection established.');

        const updateSetOperation = {
            // Reset B2C Status Fields
            isVerified: false,
            stripeSubscriptionStatus: null,
            stripeSubscriptionEndDate: null,

            // Reset Golden Member Status Fields
            isGoldenMember: false,
            acceptingNewSubscribers: true,
            stripeConnectOnboardingComplete: false,
            stripeConnectRestrictions: false,
            stripeConnectPendingFields: [],

            // Clear all social/subscription arrays (subscribers/subscriptions)
            goldenSubscribers: [],
            goldenSubscriptions: [],

            // Clear following/followers data (Optional, but safe for a fresh start)
            followers: [],
            following: [],
        };

        // Use $unset to remove old Stripe IDs completely, forcing a fresh sign-up flow
        const unsetOperation = {
            stripeCustomerId: 1, // 1 signals to MongoDB to remove the field
            stripeSubscriptionId: 1,
            stripeConnectAccountId: 1,
            goldenMemberPriceId: 1,
        };

        const result = await User.updateMany(
            {}, // Target all users
            {
                $set: updateSetOperation,
                $unset: unsetOperation
            }
        );

        console.log(`\n✅ Reset Complete.`);
        console.log(`Updated ${result.modifiedCount} user documents.`);
        console.log('All verification, golden member statuses, and subscription data have been cleared.');

    } catch (error) {
        console.error("Migration failed due to Mongoose or DB error:", error);
    } finally {
        await mongoose.connection.close();
        console.log("MongoDB connection closed.");
    }
}

resetStripeStatus().catch(console.error);
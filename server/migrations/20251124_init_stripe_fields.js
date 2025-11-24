// server/migrations/20251124_init_stripe_fields.js

// === FIX: ADD THIS LINE TO LOAD .env FILE ===
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
// ===========================================

const mongoose = require('mongoose');
const User = require('../models/User');
// Note: You must manually ensure this variable is set in your .env file
// The variable is process.env.MONGO_URI 

async function migrateStripeFields() {
    console.log('Starting migration to initialize new Stripe compliance fields...');

    // 1. Connect to the database
    if (!process.env.MONGO_URI) {
        console.error("CRITICAL ERROR: MONGO_URI is undefined. Please ensure your .env file is present and correct.");
        mongoose.connection.close(); // Prevent hanging
        return;
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connection established.');

        // 2. Find all documents where the new compliance fields are MISSING (undefined)
        const result = await User.updateMany(
            {
                $or: [
                    { stripeConnectRestrictions: { $exists: false } },
                    { stripeConnectPendingFields: { $exists: false } }
                ]
            },
            {
                $set: {
                    stripeConnectRestrictions: false,
                    stripeConnectPendingFields: []
                }
            }
        );

        console.log(`Migration complete. Updated ${result.nModified} user documents.`);

    } catch (error) {
        console.error("Migration failed due to Mongoose or DB error:", error.message);
    } finally {
        // 3. Disconnect
        await mongoose.connection.close();
        console.log("MongoDB connection closed.");
    }
}

migrateStripeFields().catch(console.error);
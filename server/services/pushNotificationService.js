const admin = require('firebase-admin');
const User = require('../models/User');
const path = require('path');

let isInitialized = false;

try {
    const serviceAccountPath = path.join(__dirname, '../service-account.json');
    // Check if file exists before requiring (to avoid crashing if user hasn't added it yet)
    const fs = require('fs');
    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        isInitialized = true;
        console.log("Firebase Admin Initialized successfully.");
    } else {
        console.warn("Warning: service-account.json not found. Push notifications will not be sent.");
    }
} catch (error) {
    console.error("Error initializing Firebase Admin:", error);
}

/**
 * Sends a push notification to a user.
 * @param {string} userId - The ID of the user to send to.
 * @param {string} title - The title of the notification.
 * @param {string} body - The body of the notification.
 * @param {object} data - Optional data payload.
 */
exports.sendPushToUser = async (userId, title, body, data = {}, notificationType = null) => {
    if (!isInitialized) return;

    try {
        const user = await User.findById(userId);
        if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
            return;
        }

        $pull: { fcmTokens: { $in: failedTokens } }
    });
}
        }

console.log(`Push sent to ${response.successCount} devices for user ${userId}`);

    } catch (error) {
    console.error("Error sending push notification:", error);
}
};

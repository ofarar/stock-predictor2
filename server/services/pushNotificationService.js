const admin = require('firebase-admin');
const User = require('../models/User');
const path = require('path');

let isInitialized = false;

try {
    const serviceAccountPath = path.join(__dirname, '../service-account.json');
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
 * @param {string} notificationType - The type of notification (e.g., 'newFollower').
 */
exports.sendPushToUser = async (userId, title, body, data = {}, notificationType = null) => {
    if (!isInitialized) return;

    try {
        const user = await User.findById(userId);
        if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
            return;
        }

        // --- FILTERING LOGIC ---
        if (notificationType && user.notificationSettings) {
            if (user.notificationSettings[notificationType] === false) {
                console.log(`Push skipped: User ${userId} has disabled '${notificationType}'.`);
                return;
            }
        }
        // -----------------------

        const message = {
            notification: {
                title: title,
                body: body,
            },
            data: data, // Client expects { url: ... } here
            tokens: user.fcmTokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(user.fcmTokens[idx]);
                }
            });

            if (failedTokens.length > 0) {
                await User.updateOne(
                    { _id: userId },
                    { $pull: { fcmTokens: { $in: failedTokens } } }
                );
                console.log(`Removed ${failedTokens.length} failed tokens for user ${userId}`);
            }
        }
    } catch (error) {
        console.error("Error sending push notification:", error);
    }
};

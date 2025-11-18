// server/services/email.js

const nodemailer = require('nodemailer');
// Note: We are switching from SendGrid's API transport to generic SMTP
// You don't need the SendGrid import anymore.

// --- 2. Configure the Brevo/SMTP Transporter ---
// You will need to obtain the BREVO_SMTP_KEY (password) from your Brevo account.
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.BREVO_SMTP_USER, 
        pass: process.env.BREVO_SMTP_KEY
    }
});

// --- 3. Update your admin email and app URL ---
const ADMIN_EMAIL = 'noreply@stockpredictorai.com'; // Your authenticated email
const APP_URL = 'https://www.stockpredictorai.com'; // Your production domain
const CONTACT_RECIPIENT = process.env.CONTACT_INBOX;

// const ADMIN_EMAIL = process.env.GMAIL_USER; // Admin email will be the same as the sender
// const APP_URL = process.env.NODE_ENV === 'production' ? 'https://predictostock.vercel.app' : 'http://localhost:3000';

// --- NEW: Reusable Email Footer ---
/**
 * Creates a standardized HTML footer for all emails.
 * @param {string} email - The email address of the recipient, for legal compliance.
 */
const createEmailFooter = (email) => {
    const currentYear = new Date().getFullYear();
    return `
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.8em; color: #777;">
            <p>&copy; ${currentYear} StockPredictorAI. All rights reserved.</p>
            <p>You are receiving this email because you created an account on StockPredictorAI with the address ${email}.</p>
            <p>
                <a href="${APP_URL}/privacy" style="color: #007BFF; text-decoration: none;">Privacy Policy</a> &bull;
                <a href="${APP_URL}/terms" style="color: #007BFF; text-decoration: none;">Terms of Service</a>
            </p>
        </div>
    `;
};

// --- NEW: Price Change Notification Email ---
exports.sendPriceChangeEmail = (email, username, creatorName, oldPrice, newPrice, effectiveDate) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h1 style="color: #007BFF; text-align: center;">Price Change Notification</h1>
            <p>Hello ${username},</p>
            <p>This is a notification that <strong>${creatorName}</strong> is changing their Golden Member subscription price.</p>
            <p>The price will change from <strong>$${oldPrice.toFixed(2)}/month</strong> to <strong>$${newPrice.toFixed(2)}/month</strong>.</p>
            <p>This change will take effect on your next billing date: <strong>${effectiveDate}</strong>.</p>
            <p>You can manage your subscriptions at any time from your profile.</p>
            ${createEmailFooter(email)}
        </div>
    `;
    transporter.sendMail({
        to: email, from: `"StockPredictorAI" <${ADMIN_EMAIL}>`,
        subject: `Price Change for your ${creatorName} Subscription`, html: emailBody
    }).catch(err => console.error("Price change email sending error:", err));
};

// --- NEW: Golden Member Activation Email ---
exports.sendGoldenActivationEmail = (email, username) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h1 style="color: #F0AD4E; text-align: center;">⭐ You are now a Golden Member! ⭐</h1>
            <p>Hello ${username},</p>
            <p>Congratulations! Your Golden Member status is now active. You can start creating exclusive content and building your subscriber base.</p>
            <p>If you haven't already, make sure your Stripe account is fully connected so you can receive payouts.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/golden-feed" style="background-color: #F0AD4E; color: #000; padding: 14px 25px; text-decoration: none; display: inline-block; border-radius: 8px; font-weight: bold;">
                    Create Your First Post
                </a>
            </div>
            ${createEmailFooter(email)}
        </div>
    `;
    transporter.sendMail({
        to: email, from: `"StockPredictorAI" <${ADMIN_EMAIL}>`,
        subject: 'Your Golden Member Status is Active!', html: emailBody
    }).catch(err => console.error("Golden activation email sending error:", err));
};

// --- NEW: Golden Member Deactivation Email ---
exports.sendGoldenDeactivationEmail = (email, username) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h1 style="color: #D9534F; text-align: center;">Golden Member Status Deactivated</h1>
            <p>Hello ${username},</p>
            <p>This email confirms that you have successfully deactivated your Golden Member status. You will no longer be able to receive new subscribers, and your existing subscribers have been notified.</p>
            <p>You can reactivate your Golden Member status at any time from your profile settings.</p>
            <p style="margin-top: 20px; font-size: 0.9em; color: #777;">
                - The StockPredictorAI Team
            </p>
            ${createEmailFooter(email)} 
        </div>
    `;
    transporter.sendMail({
        to: email, from: `"StockPredictorAI" <${ADMIN_EMAIL}>`,
        subject: 'Your Golden Member Status is Deactivated', html: emailBody
    }).catch(err => console.error("Golden deactivation email sending error:", err));
};

// --- UPDATED: Existing Email Functions (with new footer) ---

exports.sendWelcomeEmail = (email, username) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h1 style="color: #4CAF50; text-align: center;">Welcome to StockPredictorAI, ${username}!</h1>
            <p>We're thrilled to have you on board!</p>
            <p>Ready to jump in? You can start by making your first prediction or see what the community is predicting right now.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/?action=predict" style="background-color: #4CAF50; color: white; padding: 14px 25px; text-decoration: none; display: inline-block; border-radius: 8px; font-weight: bold;">
                    Make Your First Prediction
                </a>
            </div>
            ${createEmailFooter(email)}
        </div>
    `;
    transporter.sendMail({
        to: email, from: `"StockPredictorAI" <${ADMIN_EMAIL}>`,
        subject: 'Welcome to StockPredictorAI! Your Journey Begins.', html: emailBody
    }).catch(err => console.error("Welcome email sending error:", err));
};

/**
 * Sends the contact form submission to the admin.
 */
exports.sendContactFormEmail = (name, senderEmail, message) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2 style="color: #4CAF50;">New Message from StockPredictorAI Contact Form</h2>
            <p><strong>From:</strong> ${name} (${senderEmail})</p>
            <hr/>
            <p><strong>Message:</strong></p>
            <p style="background-color: #f4f4f4; border-left: 4px solid #ccc; padding: 10px;">${message.replace(/\n/g, '<br>')}</p>
        </div>
    `;

    // --- CRITICAL FIX: Change 'to' to the new recipient variable ---
    return transporter.sendMail({
        to: CONTACT_RECIPIENT, // <--- YOUR PRIVATE GMAIL ADDRESS
        from: `"StockPredictorAI Contact Form" <${ADMIN_EMAIL}>`, // <--- Brevo verified sender
        subject: `[StockPredictorAI] New Message from ${name}`,
        replyTo: senderEmail,
        html: emailBody
    });
};

exports.sendWaitlistConfirmationEmail = (email) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h1 style="color: #4CAF50;">You're on the Waitlist!</h1>
            <p>Thank you for your interest in the AI Wizard Portfolio feature.</p>
            <p>We'll notify you as soon as it's available for you to try.</p>
            ${createEmailFooter(email)}
        </div>
    `;
    transporter.sendMail({
        to: email, from: `"StockPredictorAI" <${ADMIN_EMAIL}>`,
        subject: 'You are on the waitlist for the AI Wizard!', html: emailBody
    }).catch(err => console.error("Waitlist confirmation email sending error:", err));
};

// --- NEW: Verification Email Functions ---

exports.sendVerificationSuccessEmail = (email, username) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h1 style="color: #4CAF50; text-align: center;">✅ You are now a Verified Predictor!</h1>
            <p>Hello ${username},</p>
            <p>Your subscription for the Verified Predictor status is confirmed and active. You will now have the green checkmark next to your name across the site.</p>
            <p>You can manage your subscription at any time from your profile page.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/explore" style="background-color: #007BFF; color: white; padding: 14px 25px; text-decoration: none; display: inline-block; border-radius: 8px; font-weight: bold;">
                    Explore Predictions
                </a>
            </div>
            ${createEmailFooter(email)}
        </div>
    `;
    transporter.sendMail({
        to: email, from: `"StockPredictorAI" <${ADMIN_EMAIL}>`,
        subject: 'Your Verified Predictor Status is Active!', html: emailBody
    }).catch(err => console.error("Verification success email sending error:", err));
};

exports.sendVerificationCancelledEmail = (email, username) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h1 style="color: #D9534F; text-align: center;">Your Verification Has Been Canceled</h1>
            <p>Hello ${username},</p>
            <p>This email confirms that your subscription for the Verified Predictor status has been canceled. Your checkmark and benefits will be removed at the end of your current billing period.</p>
            <p>We're sorry to see you go. Thank you for being a part of the verified community.</p>
            ${createEmailFooter(email)}
        </div>
    `;
    transporter.sendMail({
        to: email, from: `"StockPredictorAI" <${ADMIN_EMAIL}>`,
        subject: 'Verified Predictor Status Canceled', html: emailBody
    }).catch(err => console.error("Verification cancellation email sending error:", err));
};

// --- NEW: Golden Member Subscription Email Functions ---

exports.sendNewSubscriberEmail = (subscriberEmail, subscriberUsername, creatorUsername) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h1 style="color: #F0AD4E; text-align: center;">Subscription Confirmed!</h1>
            <p>Hello ${subscriberUsername},</p>
            <p>You have successfully subscribed to <strong>${creatorUsername}</strong>'s Golden Feed! You now have full access to all of their exclusive content.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/golden-feed" style="background-color: #F0AD4E; color: #000; padding: 14px 25px; text-decoration: none; display: inline-block; border-radius: 8px; font-weight: bold;">
                    View Your Golden Feed
                </a>
            </div>
            ${createEmailFooter(subscriberEmail)}
        </div>
    `;
    transporter.sendMail({
        to: subscriberEmail, from: `"StockPredictorAI" <${ADMIN_EMAIL}>`,
        subject: `You are now subscribed to ${creatorUsername}!`, html: emailBody
    }).catch(err => console.error("New subscriber email sending error:", err));
};

exports.sendCreatorNotificationEmail = (creatorEmail, creatorUsername, subscriberUsername) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h1 style="color: #4CAF50; text-align: center;">You Have a New Subscriber!</h1>
            <p>Congratulations ${creatorUsername}!</p>
            <p><strong>${subscriberUsername}</strong> has just subscribed to your Golden Feed. Keep up the great work!</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/profile/${creatorUsername}/followers?tab=Subscribers" style="background-color: #007BFF; color: white; padding: 14px 25px; text-decoration: none; display: inline-block; border-radius: 8px; font-weight: bold;">
                    View Your Subscribers
                </a>
            </div>
            ${createEmailFooter(creatorEmail)}
        </div>
    `;
    transporter.sendMail({
        to: creatorEmail, from: `"StockPredictorAI" <${ADMIN_EMAIL}>`,
        subject: `New Subscriber: ${subscriberUsername} just joined your Golden Feed!`, html: emailBody
    }).catch(err => console.error("Creator notification email sending error:", err));
};

exports.sendSubscriptionCancelledEmail = (subscriberEmail, subscriberUsername, creatorUsername) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h1 style="color: #D9534F; text-align: center;">Subscription Canceled</h1>
            <p>Hello ${subscriberUsername},</p>
            <p>This email confirms that your subscription to <strong>${creatorUsername}</strong>'s Golden Feed has been canceled. You will retain access to their content until the end of your current billing period.</p>
            ${createEmailFooter(subscriberEmail)}
        </div>
    `;
    transporter.sendMail({
        to: subscriberEmail, from: `"StockPredictorAI" <${ADMIN_EMAIL}>`,
        subject: `Your subscription to ${creatorUsername} has been canceled`, html: emailBody
    }).catch(err => console.error("Subscriber cancellation email sending error:", err));
};

exports.sendCreatorCancellationEmail = (creatorEmail, creatorUsername, subscriberUsername) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h1 style="color: #D9534F; text-align: center;">A Subscriber Has Canceled</h1>
            <p>Hello ${creatorUsername},</p>
            <p><strong>${subscriberUsername}</strong> has canceled their subscription to your Golden Feed. They will lose access at the end of their current billing period.</p>
            ${createEmailFooter(creatorEmail)}
        </div>
    `;
    transporter.sendMail({
        to: creatorEmail, from: `"StockPredictorAI" <${ADMIN_EMAIL}>`,
        subject: `Subscription Canceled: ${subscriberUsername}`, html: emailBody
    }).catch(err => console.error("Creator cancellation email sending error:", err));
};

// --- End of New Functions ---

exports.transporter = transporter;
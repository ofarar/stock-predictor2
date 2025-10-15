const nodemailer = require('nodemailer');

// We'll use a Gmail account for sending emails.
// For this to work, you'll need to enable "Less secure app access" on the Google account.
// It's recommended to use an app-specific password if you have 2-Factor Authentication enabled.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER, // Your Gmail address from .env
        pass: process.env.GMAIL_PASS  // Your Gmail password or app password from .env
    }
});

const ADMIN_EMAIL = process.env.GMAIL_USER; // Admin email will be the same as the sender

/**
 * Sends a welcome email to a new user.
 */
exports.sendWelcomeEmail = (email, username) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h1 style="color: #4CAF50; text-align: center;">Welcome to StockPredictor, ${username}!</h1>
            <p>We're thrilled to have you on board!</p>
            <p>StockPredictor is more than a game—it's a platform to sharpen your financial acumen. Here, your market insights and analytical skills take center stage.</p>
            <p>Ready to jump in? You can start by making your first prediction or see what the community is predicting right now.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://predictostock.vercel.app/?action=predict" style="background-color: #4CAF50; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 8px; font-weight: bold; margin: 10px 5px;">
                    Make Your First Prediction
                </a>
                <a href="https://predictostock.vercel.app/explore" style="background-color: #007BFF; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block; border-radius: 8px; font-weight: bold; margin: 10px 5px;">
                    See What Others Predict
                </a>
            </div>

            <p style="margin-top: 20px; font-size: 0.9em; color: #777; text-align: center;">
                Good luck!
                <br/>
                - The StockPredictor Team
            </p>
        </div>
    `;

    transporter.sendMail({
        to: email,
        from: `"StockPredictor" <${ADMIN_EMAIL}>`,
        subject: 'Welcome to StockPredictor! Your Journey Begins.',
        html: emailBody
    }).catch(err => console.error("Welcome email sending error:", err));
};

/**
 * Sends the contact form submission to the admin.
 */
exports.sendContactFormEmail = (name, senderEmail, message) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2 style="color: #4CAF50;">New Message from StockPredictor Contact Form</h2>
            <p><strong>From:</strong> ${name} (${senderEmail})</p>
            <hr/>
            <p><strong>Message:</strong></p>
            <p style="background-color: #f4f4f4; border-left: 4px solid #ccc; padding: 10px;">${message.replace(/\n/g, '<br>')}</p>
        </div>
    `;

    return transporter.sendMail({
        to: ADMIN_EMAIL,
        from: `"StockPredictor Contact Form" <${ADMIN_EMAIL}>`,
        subject: `[StockPredictor] New Message from ${name}`,
        replyTo: senderEmail,
        html: emailBody
    });
};

/**
 * Sends a confirmation email to a user who joined the AI Wizard waitlist.
 */
exports.sendWaitlistConfirmationEmail = (email) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h1 style="color: #4CAF50;">You're on the Waitlist!</h1>
            <p>Thank you for your interest in the AI Wizard Portfolio feature.</p>
            <p>You've been successfully added to our waitlist. We're working hard to bring this feature to you and will notify you as soon as it's available for you to try.</p>
            <p style="margin-top: 20px; font-size: 0.9em; color: #777;">
                Stay tuned!
                <br/>
                - The StockPredictor Team
            </p>
        </div>
    `;

    transporter.sendMail({
        to: email,
        from: `"StockPredictor" <${ADMIN_EMAIL}>`,
        subject: 'You are on the waitlist for the AI Wizard!',
        html: emailBody
    }).catch(err => console.error("Waitlist confirmation email sending error:", err));
};
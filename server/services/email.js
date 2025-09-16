const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');

const transporter = nodemailer.createTransport(sgTransport({
    auth: { api_key: process.env.SENDGRID_API_KEY }
}));

exports.sendWelcomeEmail = (email, username) => {
    const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h1 style="color: #4CAF50;">Welcome to StockPredictor, ${username}!</h1>
            <p>We're thrilled to have you on board!</p>
            <p>StockPredictor is more than a game—it's a platform to sharpen your financial acumen. Here, your market insights and analytical skills take center stage.</p>
            <p>Put your strategies to the test, build a transparent track record, and see how your analysis stacks up against the market.</p>
            <a href="https://predictostock.vercel.app" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 8px; font-weight: bold; margin-top: 10px;">
                Make Your First Prediction
            </a>
            <p style="margin-top: 20px; font-size: 0.9em; color: #777;">
                Good luck!
                <br/>
                - The StockPredictor Team
            </p>
        </div>
    `;

    transporter.sendMail({
        to: email,
        from: 'predictostock@gmail.com',
        subject: 'Welcome to StockPredictor! Your Journey Begins.',
        html: emailBody
    }).catch(err => console.error("Email sending error:", err));
};
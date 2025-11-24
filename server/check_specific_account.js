require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const ACCOUNT_ID = 'acct_1SWzUVLg8vFXXjES';

async function checkAccount() {
    try {
        console.log(`Checking account: ${ACCOUNT_ID}`);
        const account = await stripe.accounts.retrieve(ACCOUNT_ID);
        console.log('Details Submitted:', account.details_submitted);
        console.log('Payouts Enabled:', account.payouts_enabled);
        console.log('Charges Enabled:', account.charges_enabled);
        console.log('Requirements:', JSON.stringify(account.requirements, null, 2));
    } catch (error) {
        console.error('Error retrieving account:', error);
    }
}

checkAccount();

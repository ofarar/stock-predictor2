// server/routes/stripe.js

const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Ensure User model is required
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// --- NEW: Import all the new email functions ---
const {
    sendVerificationSuccessEmail,
    sendVerificationCancelledEmail,
    sendNewSubscriberEmail,
    sendCreatorNotificationEmail,
    sendSubscriptionCancelledEmail,
    sendCreatorCancellationEmail
} = require('../services/email'); // <-- ADD THIS

// Define your single Product ID (Create this manually in Stripe Dashboard or once via API)
// Ensure this is in your .env file!
const GOLDEN_MEMBERSHIP_PRODUCT_ID = process.env.STRIPE_GOLDEN_PRODUCT_ID;

// Helper function to create/update Stripe Price (kept internal to this file)
async function createOrUpdateStripePriceForUser(userId, priceInDollars, username) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const priceInCents = Math.round(priceInDollars * 100); // Ensure integer cents

    if (!GOLDEN_MEMBERSHIP_PRODUCT_ID) {
        console.error("STRIPE_GOLDEN_PRODUCT_ID is not set in environment variables!");
        throw new Error("Server configuration error: Missing Product ID.");
    }

    // Optional: Archive old price if it exists and price changed?
    // For simplicity, we create a new price each time. Manage old prices in Stripe Dashboard if needed.

    console.log(`Creating Stripe Price for user ${userId}, amount ${priceInCents} cents`);
    const price = await stripe.prices.create({
        product: GOLDEN_MEMBERSHIP_PRODUCT_ID,
        unit_amount: priceInCents,
        currency: 'eur', // Or determine dynamically based on user/platform settings
        recurring: { interval: 'month' },
        nickname: `Golden Sub for ${username} (${userId})`, // Helpful label in Stripe
        // Add metadata if needed: metadata: { userId: userId },
    });

    console.log(`Stripe Price created: ${price.id} for user ${userId}`);
    // Save the new Price ID to the user
    await User.findByIdAndUpdate(userId, { goldenMemberPriceId: price.id });
    return price.id;
}


// --- VERIFICATION CHECKOUT (User paying for their OWN verification) ---
router.post('/create-checkout-session', async (req, res) => {
    if (!req.user) return res.status(401).send('Not authenticated');

    const YOUR_DOMAIN =
        process.env.NODE_ENV === 'production'
            ? 'https://predictostock.vercel.app'
            : 'http://localhost:3000';

    const VERIFIED_PRICE_ID = process.env.VERIFIED_PRICE_ID;

    if (!VERIFIED_PRICE_ID) {
        console.error("Stripe Checkout error: VERIFIED_PRICE_ID is not set in environment variables.");
        return res.status(500).json({ message: 'Server configuration error.' });
    }

    try {
        const user = await User.findById(req.user.id);
        let customerId = user.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.username,
                metadata: { userId: user.id },
            });
            customerId = customer.id;
            await User.findByIdAndUpdate(user.id, { stripeCustomerId: customerId });
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card', 'ideal'],
            line_items: [{ price: VERIFIED_PRICE_ID, quantity: 1 }],
            mode: 'subscription',
            success_url: `${YOUR_DOMAIN}/payment-success`, // Redirect to generic success page
            cancel_url: `${YOUR_DOMAIN}/profile/${req.user.id}`, // Back to profile on cancel
            metadata: { userId: req.user.id }, // For identifying user in webhook
            subscription_data: { metadata: { userId: req.user.id } }, // Keep for redundancy
        });

        console.log('Stripe Verification session created:', session.id);
        res.json({ url: session.url }); // Return URL for frontend redirect

    } catch (error) {
        console.error('Stripe Verification Checkout error:', error);
        res.status(500).json({ message: 'Error creating payment session.' });
    }
});

// --- STRIPE CONNECT ROUTES ---

// Create Stripe Connected Account for a user becoming a Golden Member
router.post('/connect/create-account', async (req, res) => {
    if (!req.user) return res.status(401).send('Not authenticated');

    try {
        const user = await User.findById(req.user.id);
        // If account exists and onboarding IS NOT complete, maybe still return it for link generation
        if (user.stripeConnectAccountId) {
            console.log(`User ${user.id} already has Connect account: ${user.stripeConnectAccountId}`);
            return res.json({ accountId: user.stripeConnectAccountId });
        }

        console.log(`Creating Stripe Express account for user ${user.id}`);
        const account = await stripe.accounts.create({
            type: 'express',
            email: user.email,
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true }, // Required for payouts
            },
            business_type: 'individual',
            // Default currency could be set here based on platform logic
            // country: 'US', // Specify country if known and required
        });

        console.log(`Stripe Express account created: ${account.id} for user ${user.id}`);
        await User.findByIdAndUpdate(req.user.id, {
            stripeConnectAccountId: account.id,
            stripeConnectOnboardingComplete: false // Mark as needing onboarding
        });

        res.json({ accountId: account.id });

    } catch (error) {
        console.error(`Stripe Connect account creation error for user ${req.user.id}:`, error);
        res.status(500).json({ message: 'Error creating Stripe Connect account.' });
    }
});

// Create Onboarding Link for a Golden Member's Connected Account
router.post('/connect/onboarding-link', async (req, res) => {
    if (!req.user) return res.status(401).send('Not authenticated');

    const YOUR_DOMAIN = process.env.NODE_ENV === 'production' ? 'https://predictostock.vercel.app' : 'http://localhost:3000';

    try {
        const user = await User.findById(req.user.id);
        if (!user.stripeConnectAccountId) {
            // If they don't have an account ID yet, try creating one first
            console.log(`No Connect Account ID for user ${user.id}. Attempting to create one before generating link.`);
            const account = await stripe.accounts.create({ type: 'express', email: user.email, capabilities: { transfers: { requested: true } }, business_type: 'individual' });
            user.stripeConnectAccountId = account.id;
            user.stripeConnectOnboardingComplete = false;
            await user.save();
            console.log(`Created new Connect Account ${account.id} for user ${user.id} during onboarding link request.`);
        }

        console.log(`Creating onboarding link for Connect account: ${user.stripeConnectAccountId}`);
        const accountLink = await stripe.accountLinks.create({
            account: user.stripeConnectAccountId,
            refresh_url: `${YOUR_DOMAIN}/profile/edit?onboarding=refresh`, // Send back to edit profile on refresh/error
            return_url: `${YOUR_DOMAIN}/profile/${req.user.id}?onboarding=complete`, // Back to profile on success
            type: 'account_onboarding',
            collect: 'eventually_due', // Recommended for smoother onboarding
        });

        console.log(`Onboarding link created for ${user.stripeConnectAccountId}: ${accountLink.url.substring(0, 50)}...`);
        res.json({ url: accountLink.url });

    } catch (error) {
        console.error(`Stripe Connect onboarding link error for user ${req.user.id}:`, error);
        res.status(500).json({ message: 'Error creating onboarding link.' });
    }
});

// --- GOLDEN MEMBER SUBSCRIPTION CHECKOUT (User B subscribing to User A) ---
router.post('/subscribe-to-member/:goldenMemberId', async (req, res) => {
    if (!req.user) return res.status(401).send('Not authenticated');

    const { goldenMemberId } = req.params;
    const payingUserId = req.user.id;

    if (payingUserId === goldenMemberId) {
        return res.status(400).json({ message: "You cannot subscribe to yourself." });
    }

    const YOUR_DOMAIN = process.env.NODE_ENV === 'production' ? 'https://predictostock.vercel.app' : 'http://localhost:3000';

    try {
        const [payingUser, targetGoldenMember] = await Promise.all([
            User.findById(payingUserId),
            User.findById(goldenMemberId)
        ]);

        // --- Validations ---
        if (!targetGoldenMember) return res.status(404).json({ message: "Golden Member not found." });
        if (!targetGoldenMember.isGoldenMember) return res.status(400).json({ message: "This user is not an active Golden Member." });
        if (!targetGoldenMember.acceptingNewSubscribers) return res.status(400).json({ message: "This member is not currently accepting new subscribers." });
        if (!targetGoldenMember.stripeConnectAccountId || !targetGoldenMember.goldenMemberPriceId || !targetGoldenMember.stripeConnectOnboardingComplete) {
            console.warn(`Attempt to subscribe to Golden Member ${goldenMemberId} who has not completed Stripe onboarding or price setup.`);
            return res.status(400).json({ message: 'This member cannot receive payments at this time.' });
        }
        if (payingUser.goldenSubscriptions.some(sub => sub.user && sub.user.toString() === goldenMemberId)) {
            return res.status(400).json({ message: 'You are already subscribed to this member.' });
        }
        // --- End Validations ---


        // Ensure paying user has a Stripe Customer ID
        let payingUserCustomerId = payingUser.stripeCustomerId;
        if (!payingUserCustomerId) {
            console.log(`Creating Stripe Customer for paying user ${payingUserId}`);
            const customer = await stripe.customers.create({
                email: payingUser.email,
                name: payingUser.username,
                metadata: { userId: payingUserId },
            });
            payingUserCustomerId = customer.id;
            await User.findByIdAndUpdate(payingUserId, { stripeCustomerId: payingUserCustomerId });
            console.log(`Stripe Customer created: ${payingUserCustomerId} for user ${payingUserId}`);
        }

        console.log(`Creating Subscription Checkout Session: User ${payingUserId} to Golden Member ${goldenMemberId} (Price ID: ${targetGoldenMember.goldenMemberPriceId})`);

        const session = await stripe.checkout.sessions.create({
            customer: payingUserCustomerId,
            payment_method_types: ['card', 'ideal'],
            line_items: [{
                price: targetGoldenMember.goldenMemberPriceId,
                quantity: 1
            }],
            mode: 'subscription',
            success_url: `${YOUR_DOMAIN}/profile/${goldenMemberId}?subscribe=success`, // Redirect back to member's profile
            cancel_url: `${YOUR_DOMAIN}/profile/${goldenMemberId}`,
            subscription_data: {
                application_fee_percent: 30, // Your 30% platform commission
                transfer_data: {
                    destination: targetGoldenMember.stripeConnectAccountId, // Target Golden Member's Connect account
                },
                metadata: { // Metadata stored ON THE SUBSCRIPTION object
                    payingUserId: payingUserId,
                    goldenMemberUserId: goldenMemberId
                }
            },
            metadata: { // Metadata stored ON THE SESSION object (used in checkout.session.completed)
                payingUserId: payingUserId,
                goldenMemberUserId: goldenMemberId
            }
        });

        console.log(`Subscription Checkout Session created: ${session.id}`);
        res.json({ url: session.url }); // Return URL for frontend redirect

    } catch (error) {
        console.error(`Error creating subscription session for ${payingUserId} to ${goldenMemberId}:`, error);
        res.status(500).json({ message: 'Error creating subscription session.' });
    }
});

// --- STRIPE CUSTOMER PORTAL ---
router.post('/create-portal-session', async (req, res) => {
    if (!req.user) return res.status(401).send('Not authenticated');
    const YOUR_DOMAIN = process.env.NODE_ENV === 'production' ? 'https://predictostock.vercel.app' : 'http://localhost:3000';

    try {
        const user = await User.findById(req.user.id);
        if (!user.stripeCustomerId) {
            return res.status(400).json({ message: 'User is not a Stripe customer.' });
        }
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${YOUR_DOMAIN}/profile/${req.user.id}`,
            // locale: 'auto' is default, or pass user.language if valid
        });
        res.json({ url: portalSession.url });
    } catch (error) {
        console.error("Stripe Portal error:", error);
        res.status(500).json({ message: 'Error creating portal session.' });
    }
});


// --- WEBHOOK HANDLER ---
// Remember to configure this endpoint in your Stripe dashboard (Test and Live)
// and use the correct Signing Secret in your .env file.
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    // Verify webhook signature
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            console.log('Webhook received: checkout.session.completed for session:', session.id);

            // Determine if this is for Verification or Golden Member Subscription
            const isVerification = session.metadata?.userId && !session.metadata?.payingUserId; // Verification has userId directly
            const isGoldenSub = session.metadata?.payingUserId && session.metadata?.goldenMemberUserId;

            if (isVerification) {
                // --- Handle VERIFICATION Subscription ---
                console.log(`Webhook: Processing as Verification for session ${session.id}`);
                const userId = session.metadata.userId;
                const subscriptionId = session.subscription;
                const customerId = session.customer;

                if (!userId || !subscriptionId || !customerId) {
                    console.error(`Webhook Error: Missing IDs for Verification in session ${session.id}`);
                    return res.status(400).send('Webhook Error: Missing required data for verification.');
                }

                try {
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    const updateData = {
                        isVerified: true,
                        verifiedAt: new Date(),
                        stripeSubscriptionId: subscriptionId,
                        stripeCustomerId: customerId,
                        stripeSubscriptionStatus: subscription.status,
                        stripeSubscriptionEndDate: (
                            subscription.cancel_at_period_end && typeof subscription.cancel_at === 'number'
                                ? new Date(subscription.cancel_at * 1000)
                                : (typeof subscription.current_period_end === 'number'
                                    ? new Date(subscription.current_period_end * 1000)
                                    : null // Fallback to null if neither timestamp is valid
                                )
                        ),
                    };
                    console.log(`Webhook: Attempting to update VERIFICATION for user ${userId} with data:`, updateData);
                    
                    // --- MODIFICATION: Fetch user *after* update ---
                    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
                    console.log(`User ${userId} successfully verified via checkout session ${session.id}.`);
                    
                    // Send the email
                    if (user) {
                        sendVerificationSuccessEmail(user.email, user.username);
                    }
                    // --- END MODIFICATION ---

                } catch (dbOrApiError) {
                    console.error(`Webhook Processing Error for Verification (User ${userId}, Sub ${subscriptionId}):`, dbOrApiError);
                    return res.status(500).send('Webhook Error: Internal processing failed.');
                }

            } else if (isGoldenSub) {
                // --- Handle GOLDEN MEMBER Subscription ---
                const payingUserId = session.metadata.payingUserId;
                const goldenMemberUserId = session.metadata.goldenMemberUserId;
                const subscriptionId = session.subscription;

                console.log(`Webhook: Processing as Golden Subscription: User ${payingUserId} to Member ${goldenMemberUserId}, Sub ID: ${subscriptionId}, Session ID: ${session.id}`);

                if (!payingUserId || !goldenMemberUserId || !subscriptionId) {
                    console.error(`Webhook Error: Missing IDs for Golden Subscription in session ${session.id}`);
                    return res.status(400).send('Webhook Error: Missing required metadata for subscription.');
                }

                try {
                    // --- MODIFICATION: Add email logic ---
                    await Promise.all([
                        User.findByIdAndUpdate(payingUserId, {
                            $addToSet: { goldenSubscriptions: { user: goldenMemberUserId, subscribedAt: new Date() } }
                        }),
                        User.findByIdAndUpdate(goldenMemberUserId, {
                            $addToSet: { goldenSubscribers: { user: payingUserId, subscribedAt: new Date() } }
                        })
                    ]);
                    console.log(`Webhook: Successfully recorded Golden Subscription: ${payingUserId} subscribed to ${goldenMemberUserId}`);
                    
                    // Send emails to both parties
                    const payingUser = await User.findById(payingUserId);
                    const goldenMember = await User.findById(goldenMemberUserId);

                    if (payingUser && goldenMember) {
                        // Email to the subscriber
                        sendNewSubscriberEmail(payingUser.email, payingUser.username, goldenMember.username);
                        // Email to the creator
                        sendCreatorNotificationEmail(goldenMember.email, goldenMember.username, payingUser.username);
                    }
                    // --- END MODIFICATION ---

                } catch (dbError) {
                    console.error(`Webhook DB Error: Failed to update users for Golden Subscription (Paying: ${payingUserId}, Member: ${goldenMemberUserId}, Sub: ${subscriptionId}):`, dbError);
                    return res.status(500).send('Webhook Error: Failed to update subscription details.');
                }
            } else {
                console.warn(`Webhook Warning: checkout.session.completed event for session ${session.id} ignored (unknown structure). Metadata:`, session.metadata);
            }
            break; // End checkout.session.completed
        }

        case 'account.updated': {
            // Handles updates to Connected Accounts (e.g., onboarding completion)
            const account = event.data.object;
            console.log(`Webhook received: account.updated for Connect account: ${account.id}`);

            const detailsSubmitted = account.details_submitted;
            const payoutsEnabled = account.payouts_enabled;
            const isOnboardingComplete = detailsSubmitted && payoutsEnabled;

            try {
                const user = await User.findOne({ stripeConnectAccountId: account.id });
                if (user) {
                    let needsPriceCreation = false;
                    if (user.stripeConnectOnboardingComplete !== isOnboardingComplete) {
                        user.stripeConnectOnboardingComplete = isOnboardingComplete;
                        await user.save();
                        console.log(`Webhook: Updated stripeConnectOnboardingComplete for user ${user.id} to ${isOnboardingComplete}`);
                        // Check if we need to create the price *after* saving the onboarding status
                        if (isOnboardingComplete && user.isGoldenMember && !user.goldenMemberPriceId) {
                            needsPriceCreation = true;
                        }
                    } else {
                        console.log(`Webhook: No change in onboarding status for user ${user.id} (${isOnboardingComplete}).`);
                    }

                    // Create Stripe Price if onboarding just completed and they are Golden
                    if (needsPriceCreation) {
                        console.log(`Webhook: Onboarding complete for Golden Member ${user.id}. Creating initial Stripe Price.`);
                        try {
                            await createOrUpdateStripePriceForUser(user.id, user.goldenMemberPrice, user.username);
                        } catch (priceError) {
                            console.error(`Webhook Error: Failed to create initial Stripe Price for user ${user.id} after onboarding:`, priceError);
                        }
                    }

                } else {
                    console.warn(`Webhook Warning: Received account.updated event for account ${account.id}, but no matching user found.`);
                }
            } catch (dbError) {
                console.error(`Webhook DB Error: Failed to process account.updated event for account ${account.id}:`, dbError);
                return res.status(500).send('Webhook Error: Failed to update user onboarding status.');
            }
            break; // End account.updated
        }

        // --- Subscription Updates/Deletions ---
        // These primarily affect the PAYING user. Determine if it's a Verification sub or Golden Member sub.
        case 'customer.subscription.updated': {
            const subscription = event.data.object;
            const subscriptionMetadata = subscription.metadata || {};
            const isVerificationSub = subscriptionMetadata.userId && !subscriptionMetadata.payingUserId;
            const isGoldenSub = subscriptionMetadata.payingUserId && subscriptionMetadata.goldenMemberUserId;

            console.log(`Webhook received: customer.subscription.updated for sub ${subscription.id}. Status: ${subscription.status}`);

            if (isVerificationSub) {
                const userId = subscriptionMetadata.userId;
                console.log(`Webhook: Processing sub update as Verification for user ${userId}`);
                try {
                    const newIsVerified = ['active', 'trialing'].includes(subscription.status);
                    await User.findOneAndUpdate(
                        { stripeSubscriptionId: subscription.id }, // Find user by THEIR sub ID
                        {
                            stripeSubscriptionStatus: subscription.status,
                            stripeSubscriptionEndDate: (
                                subscription.cancel_at_period_end && typeof subscription.cancel_at === 'number'
                                    ? new Date(subscription.cancel_at * 1000) // Use cancel_at if scheduled cancellation
                                    : (typeof subscription.current_period_end === 'number'
                                        ? new Date(subscription.current_period_end * 1000) // Otherwise, use current period end
                                        : null // Fallback if neither is valid
                                    )
                            ),
                            isVerified: newIsVerified,
                            verifiedAt: newIsVerified ? (await User.findOne({ stripeSubscriptionId: subscription.id }).select('verifiedAt'))?.verifiedAt || new Date() : null, // Keep date if still verified, else null
                        }
                    );
                    console.log(`Webhook: Updated Verification status for user ${userId} to ${subscription.status}.`);
                } catch (dbError) {
                    console.error(`Webhook DB Error: Failed updating Verification sub status for user ${userId}, sub ${subscription.id}:`, dbError);
                    return res.status(500).send('Webhook Error: Internal processing failed.');
                }

            } else if (isGoldenSub) {
                const payingUserId = subscriptionMetadata.payingUserId;
                const goldenMemberUserId = subscriptionMetadata.goldenMemberUserId;
                console.log(`Webhook: Processing sub update as Golden Sub: Paying User ${payingUserId} to Member ${goldenMemberUserId}, sub ${subscription.id}`);
                // Logic to update the relationship status in your DB if needed (e.g., mark as 'canceled_pending')
                // This depends on how you model the subscription relationship. For now, we only store active subs.
                console.log(`Webhook: Golden Subscription ${subscription.id} status changed to ${subscription.status}. (No direct DB update implemented for this specific status change yet).`);
            } else {
                console.warn(`Webhook Warning: customer.subscription.updated event for sub ${subscription.id} ignored (unknown structure/metadata).`);
            }
            break; // End customer.subscription.updated
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object;
            const subscriptionMetadata = subscription.metadata || {};
            const isVerificationSub = subscriptionMetadata.userId && !subscriptionMetadata.payingUserId;
            const isGoldenSub = subscriptionMetadata.payingUserId && subscriptionMetadata.goldenMemberUserId;

            console.log(`Webhook received: customer.subscription.deleted for sub ${subscription.id}.`);

            if (isVerificationSub) {
                const userId = subscriptionMetadata.userId;
                console.log(`Webhook: Processing sub deletion as Verification for user ${userId}`);
                try {
                    // --- MODIFICATION: Add email logic ---
                    const user = await User.findOneAndUpdate(
                        { stripeSubscriptionId: subscription.id }, // Find by THEIR sub ID
                        {
                            isVerified: false,
                            verifiedAt: null,
                            stripeSubscriptionStatus: null,
                            stripeSubscriptionEndDate: null,
                            stripeSubscriptionId: null, // Clear the ID
                        }
                    );
                    console.log(`Webhook: Verification removed for user ${userId} due to sub ${subscription.id} deletion.`);

                    // Send cancellation email
                    if (user) {
                        sendVerificationCancelledEmail(user.email, user.username);
                    }
                    // --- END MODIFICATION ---

                } catch (dbError) {
                    console.error(`Webhook DB Error: Failed updating Verification sub deletion for user ${userId}, sub ${subscription.id}:`, dbError);
                    return res.status(500).send('Webhook Error: Internal processing failed.');
                }
            } else if (isGoldenSub) {
                const payingUserId = subscriptionMetadata.payingUserId;
                const goldenMemberUserId = subscriptionMetadata.goldenMemberUserId;
                console.log(`Webhook: Processing sub deletion as Golden Sub: Paying User ${payingUserId} to Member ${goldenMemberUserId}, sub ${subscription.id}`);
                try {
                    // --- MODIFICATION: Add email logic ---
                    // Remove the relationship from both users' arrays
                    await Promise.all([
                        User.findByIdAndUpdate(payingUserId, {
                            $pull: { goldenSubscriptions: { user: goldenMemberUserId } } // Remove based on the member ID
                        }),
                        User.findByIdAndUpdate(goldenMemberUserId, {
                            $pull: { goldenSubscribers: { user: payingUserId } } // Remove based on the paying user ID
                        })
                    ]);
                    console.log(`Webhook: Removed Golden Subscription relationship between ${payingUserId} and ${goldenMemberUserId}.`);
                    
                    // Send cancellation emails
                    const payingUser = await User.findById(payingUserId);
                    const goldenMember = await User.findById(goldenMemberUserId);

                    if (payingUser && goldenMember) {
                        // Email to the subscriber
                        sendSubscriptionCancelledEmail(payingUser.email, payingUser.username, goldenMember.username);
                        // Email to the creator
                        sendCreatorCancellationEmail(goldenMember.email, goldenMember.username, payingUser.username);
                    }
                    // --- END MODIFICATION ---

                } catch (dbError) {
                    console.error(`Webhook DB Error: Failed removing Golden Subscription relationship (Paying: ${payingUserId}, Member: ${goldenMemberUserId}, Sub: ${subscription.id}):`, dbError);
                    return res.status(500).send('Webhook Error: Failed to update subscription details.');
                }
            } else {
                console.warn(`Webhook Warning: customer.subscription.deleted event for sub ${subscription.id} ignored (unknown structure/metadata).`);
            }
            break; // End customer.subscription.deleted
        }

        default:
            // console.log(`Unhandled event type ${event.type}`); // Keep this commented unless debugging specific events
            break;
    } // End switch

    // Acknowledge receipt of the event to Stripe
    res.json({ received: true });
}); // End webhook handler

module.exports = {
    router, // Keep exporting the router
    createOrUpdateStripePriceForUser // Export the helper function too
};
const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Ensure User model is required

// Initialize Stripe with your secret key
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create Stripe Checkout session for subscription
router.post('/create-checkout-session', async (req, res) => {
    if (!req.user) return res.status(401).send('Not authenticated');

    const YOUR_DOMAIN =
        process.env.NODE_ENV === 'production'
            ? 'https://predictostock.vercel.app'
            : 'http://localhost:3000';

    const VERIFIED_PRICE_ID = process.env.VERIFIED_PRICE_ID;

    // Ensure VERIFIED_PRICE_ID is set in your environment variables
    if (!VERIFIED_PRICE_ID) {
        console.error("Stripe Checkout error: VERIFIED_PRICE_ID is not set in environment variables.");
        return res.status(500).json({ message: 'Server configuration error.' });
    }

    try {
        const user = await User.findById(req.user.id);
        let customerId = user.stripeCustomerId;

        // If user is not a Stripe customer yet, create one
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.username,
                metadata: { userId: user.id }, // Add userId here too, helpful for customer management
            });
            customerId = customer.id;
            await User.findByIdAndUpdate(user.id, { stripeCustomerId: customerId });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card', 'ideal'], // Enable iDEAL
            line_items: [{ price: VERIFIED_PRICE_ID, quantity: 1 }],
            mode: 'subscription',
            success_url: `${YOUR_DOMAIN}/payment-success`, // Redirect to a dedicated success page
            cancel_url: `${YOUR_DOMAIN}/profile/${req.user.id}`, // Back to profile on cancel
            // *** CHANGE 1: Add metadata directly to the session ***
            metadata: { userId: req.user.id },
            // Keep subscription_data metadata for potential future use or other webhook events
            subscription_data: { metadata: { userId: req.user.id } },
        });

        console.log('Stripe session created:', session.id); // Log session ID

        // Return the session ID for redirection using stripe.redirectToCheckout on the frontend
        // OR return the full URL if you prefer redirecting via window.location.href
        // res.json({ id: session.id }); // Use this if using stripe.redirectToCheckout in frontend
        res.json({ url: session.url }); // Use this if using window.location.href in frontend (as per your current VerificationModal)

    } catch (error) {
        console.error('Stripe Checkout error:', error);
        res.status(500).json({ message: 'Error creating payment session.' });
    }
});

// Endpoint for managing subscriptions (Stripe Customer Portal)
router.post('/create-portal-session', async (req, res) => {
    if (!req.user) return res.status(401).send('Not authenticated');
    const YOUR_DOMAIN = process.env.NODE_ENV === 'production' ? 'https://predictostock.vercel.app' : 'http://localhost:3000';

    try {
        const user = await User.findById(req.user.id);
        if (!user.stripeCustomerId) {
            return res.status(400).json({ message: 'User is not a Stripe customer.' });
        }
        // Use stripe.billingPortal.sessions.create
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${YOUR_DOMAIN}/profile/${req.user.id}`, // Return user to their profile
        });
        res.json({ url: portalSession.url });
    } catch (error) {
        console.error("Stripe Portal error:", error);
        res.status(500).json({ message: 'Error creating portal session.' });
    }
});

// Webhook handler for Stripe to send updates
// IMPORTANT: Use express.raw() BEFORE any global express.json() in server.js mounts this route
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
            console.log('Received checkout.session.completed event for session:', session.id);

            // *** CHANGE 2: Updated logic to find userId ***
            let userId = session.metadata ? session.metadata.userId : null;

            // Fallback: Check subscription metadata if session metadata is missing
            if (!userId && session.subscription) {
                try {
                    console.log(`userId missing in session metadata, attempting to retrieve from subscription ${session.subscription}`);
                    const subscription = await stripe.subscriptions.retrieve(session.subscription);
                    userId = subscription.metadata ? subscription.metadata.userId : null;
                } catch (subError) {
                    console.error(`Webhook Error: Could not retrieve subscription ${session.subscription} to get metadata.`, subError);
                }
            }

            if (!userId) {
                console.error('Webhook Error: userId not found in session metadata OR subscription metadata for checkout.session.completed:', session.id);
                // Return 400 because we can't process without the userId
                return res.status(400).send('Webhook Error: Missing user metadata.');
            }

            const subscriptionId = session.subscription;
            const customerId = session.customer;

            if (!subscriptionId || !customerId) {
                console.error('Webhook Error: Subscription ID or Customer ID missing in checkout.session.completed payload:', session.id);
                return res.status(400).send('Webhook Error: Missing subscription or customer ID.');
            }

            try {
                console.log(`Webhook: Processing checkout.session.completed for user ${userId}, sub ${subscriptionId}`); // Log start

                // *** Log before retrieving subscription ***
                console.log(`Webhook: Attempting to retrieve subscription ${subscriptionId}`);
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                // *** Log after retrieving subscription ***
                console.log(`Webhook: Successfully retrieved subscription. Status: ${subscription.status}`);

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

                // *** Log before updating database ***
                console.log(`Webhook: Attempting to update user ${userId} with data:`, updateData);
                await User.findByIdAndUpdate(userId, updateData);
                // *** Log after updating database ***
                console.log(`Webhook: Successfully updated user ${userId}.`);

                console.log(`User ${userId} successfully subscribed and is now verified via checkout session ${session.id}.`); // Keep original success log
            } catch (dbOrApiError) {
                // *** Log the specific error that caused the 500 ***
                console.error(`Webhook Processing Error for checkout.session.completed (User ${userId}, Sub ${subscriptionId}):`, dbOrApiError);
                return res.status(500).send('Webhook Error: Internal processing failed.');
            }
            break; // End of case
        }
        case 'customer.subscription.updated': {
            const subscription = event.data.object;
            // Get userId directly from subscription metadata (should have been set during creation)
            const userId = subscription.metadata ? subscription.metadata.userId : null;

            if (!userId) {
                console.warn(`Webhook Warning: userId not found in metadata for customer.subscription.updated event: ${subscription.id}. Skipping update.`);
                break; // Skip if we don't know which user this belongs to
            }

            console.log(`Received customer.subscription.updated event for user ${userId}, subscription ${subscription.id}. Status: ${subscription.status}`);

            try {
                // Update user based on the subscription status
                await User.findOneAndUpdate(
                    { stripeSubscriptionId: subscription.id }, // Find user by subscription ID
                    {
                        stripeSubscriptionStatus: subscription.status,
                        // Update end date if cancelled, otherwise use current period end
                        stripeSubscriptionEndDate: subscription.cancel_at_period_end
                            ? new Date(subscription.cancel_at * 1000)
                            : new Date(subscription.current_period_end * 1000),
                        // Potentially update isVerified based on status (e.g., set to false if 'canceled' or 'unpaid')
                        isVerified: ['active', 'trialing'].includes(subscription.status), // Example: Keep verified if active or trialing
                        verifiedAt: newIsVerified ? (await User.findOne({ stripeSubscriptionId: subscription.id }).select('verifiedAt'))?.verifiedAt || new Date() : null,
                    }
                );
                console.log(`Updated subscription status for user ${userId} to ${subscription.status}.`);
            } catch (dbError) {
                console.error(`Webhook Error: Failed to update user ${userId} for customer.subscription.updated event ${subscription.id}.`, dbError);
                return res.status(500).send('Webhook Error: Internal processing failed.');
            }
            break;
        }
        case 'customer.subscription.deleted': {
            // Occurs when a subscription is definitively canceled (immediately or at period end)
            const subscription = event.data.object;
            const userId = subscription.metadata ? subscription.metadata.userId : null; // Get userId from metadata

            if (!userId) {
                console.warn(`Webhook Warning: userId not found in metadata for customer.subscription.deleted event: ${subscription.id}. Skipping update.`);
                break; // Skip if we don't know which user this belongs to
            }

            console.log(`Received customer.subscription.deleted event for user ${userId}, subscription ${subscription.id}.`);

            try {
                // Remove verification and Stripe details from the user
                await User.findOneAndUpdate(
                    { stripeSubscriptionId: subscription.id },
                    {
                        isVerified: false,
                        verifiedAt: null,
                        stripeSubscriptionStatus: null, // Clear status
                        stripeSubscriptionEndDate: null, // Clear end date
                        stripeSubscriptionId: null, // Optional: Clear the subscription ID too
                    }
                );
                console.log(`Subscription ${subscription.id} ended. Verification removed for user ${userId}.`);
            } catch (dbError) {
                console.error(`Webhook Error: Failed to update user ${userId} for customer.subscription.deleted event ${subscription.id}.`, dbError);
                return res.status(500).send('Webhook Error: Internal processing failed.');
            }
            break;
        }
        default:
            // Temporarily log unhandled events to see if others are important
            // console.log(`Unhandled event type ${event.type}`);
            break;
    }

    // Acknowledge receipt of the event
    res.json({ received: true });
});

module.exports = router; // Ensure the router is exported
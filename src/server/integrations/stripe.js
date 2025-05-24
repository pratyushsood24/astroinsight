// astroinsight/src/server/integrations/stripe.js
import Stripe from 'stripe';
import { logger } from '../utils/logger.js';
import prisma from '@wasp/db';
import HttpError from '@wasp/core/HttpError.js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const WASP_WEB_CLIENT_URL = process.env.WASP_WEB_CLIENT_URL || 'http://localhost:3000';

if (!STRIPE_SECRET_KEY) {
  logger.error('STRIPE_SECRET_KEY is not set. Stripe integration will not work.');
}
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;

// Plan Price IDs from environment variables (ensure these are set)
const BASIC_PLAN_PRICE_ID = process.env.STRIPE_BASIC_PLAN_PRICE_ID;
const PREMIUM_PLAN_PRICE_ID = process.env.STRIPE_PREMIUM_PLAN_PRICE_ID;

const PLAN_DETAILS = {
  basic: { priceId: BASIC_PLAN_PRICE_ID, name: 'Basic Plan', credits: 50 }, // Example credits
  premium: { priceId: PREMIUM_PLAN_PRICE_ID, name: 'Premium Plan', credits: 200 }, // Example credits
};

function getPlanDetailsById(priceId) {
  for (const planKey in PLAN_DETAILS) {
    if (PLAN_DETAILS[planKey].priceId === priceId) {
      return { planId: planKey, ...PLAN_DETAILS[planKey] };
    }
  }
  return null;
}

/**
 * Creates a Stripe Checkout Session for a user to subscribe.
 * @param {object} args - { planId: string }
 * @param {object} context - { user: User }
 * @returns {Promise<object>} - { sessionId: string }
 */
export async function createStripeCheckoutSession({ planId }, context) {
  if (!context.user || !context.user.id) {
    throw new HttpError(401, 'User not authenticated.');
  }
  if (!stripe) {
    throw new HttpError(500, 'Stripe service is not available.');
  }

  const planDetail = PLAN_DETAILS[planId];
  if (!planDetail || !planDetail.priceId) {
    throw new HttpError(400, `Invalid plan ID or price ID not configured for: ${planId}`);
  }

  const user = await prisma.user.findUnique({ where: { id: context.user.id }});
  if (!user) {
    throw new HttpError(404, 'User not found.');
  }

  let stripeCustomerId = user.stripeCustomerId;

  // Create a Stripe customer if one doesn't exist
  if (!stripeCustomerId) {
    try {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username || user.email.split('@')[0],
        metadata: {
          userId: user.id.toString(), // Link Stripe customer to app user
        },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });
    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw new HttpError(500, 'Could not create Stripe customer.');
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: planDetail.priceId,
          quantity: 1,
        },
      ],
      success_url: `${WASP_WEB_CLIENT_URL}/dashboard?subscription_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${WASP_WEB_CLIENT_URL}/pricing?subscription_canceled=true`,
      // Enable promo codes if desired
      // allow_promotion_codes: true,
      metadata: {
        userId: user.id.toString(),
        planId: planId, // Store planId to use in webhook
      }
    });
    return { sessionId: session.id, url: session.url };
  } catch (error) {
    logger.error('Error creating Stripe Checkout session:', error);
    throw new HttpError(500, 'Could not create Stripe Checkout session.');
  }
}

/**
 * Creates a Stripe Portal Session for a user to manage their subscription.
 * @param {object} args - {}
 * @param {object} context - { user: User }
 * @returns {Promise<object>} - { portalUrl: string }
 */
export async function createStripePortalSession(_args, context) {
  if (!context.user || !context.user.id) {
    throw new HttpError(401, 'User not authenticated.');
  }
  if (!stripe) {
    throw new HttpError(500, 'Stripe service is not available.');
  }

  const user = await prisma.user.findUnique({ where: { id: context.user.id }});
  if (!user || !user.stripeCustomerId) {
    throw new HttpError(400, 'User does not have a Stripe customer ID. Cannot manage subscription.');
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${WASP_WEB_CLIENT_URL}/account`,
    });
    return { portalUrl: portalSession.url };
  } catch (error) {
    logger.error('Error creating Stripe Portal session:', error);
    throw new HttpError(500, 'Could not create Stripe Portal session.');
  }
}

// Stripe Webhook Handler (defined as an API route in main.wasp)
export async function stripeWebhookHandler(req, res, context) {
  if (!stripe) {
    logger.error('Stripe not initialized, cannot handle webhook.');
    return res.status(500).send('Stripe service unavailable.');
  }
  if (!STRIPE_WEBHOOK_SECRET) {
    logger.error('STRIPE_WEBHOOK_SECRET is not set. Cannot verify webhook.');
    return res.status(500).send('Webhook secret not configured.');
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Wasp provides rawBody for webhook verification
    // If Wasp's version changes how rawBody is accessed, this might need adjustment.
    // Check Wasp docs for `req.rawBody` or similar for webhooks.
    // Assuming `req.rawBody` is available as Wasp might parse JSON by default.
    // If Wasp doesn't provide rawBody directly, this will fail.
    // A common workaround is to use a middleware that captures rawBody *before* JSON parsing.
    // Wasp > v0.11.6 should have `req.rawBody`.
    if (!req.rawBody) {
      logger.error('req.rawBody is not available for Stripe webhook verification. Check Wasp version/setup.');
      // For now, we'll try to proceed assuming it might be an issue with how Wasp handles it or if it's plain text
      // This is NOT secure for production without rawBody.
      // throw new Error('rawBody not available for webhook signature verification');
      // The line below is a placeholder. Real verification needs the raw body.
      // event = JSON.parse(req.body); // DANGEROUS: Skips verification if rawBody fails
      // This is the correct way:
      event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } else {
       event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
    }

  } catch (err) {
    logger.error(`⚠️ Stripe Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  logger.info(`Received Stripe event: ${event.type}`);
  // For debugging, log the full event if needed (can be verbose)
  // logger.debug('Stripe event object:', JSON.stringify(event, null, 2));

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        logger.info(`Checkout session completed for session ID: ${session.id}`);
        // session.metadata should contain userId and planId if set during creation
        const userId = parseInt(session.metadata?.userId);
        const planId = session.metadata?.planId; // e.g., 'basic', 'premium'
        const stripeSubscriptionId = session.subscription;
        const stripeCustomerId = session.customer;

        if (!userId || !planId || !stripeSubscriptionId || !stripeCustomerId) {
          logger.error('Missing metadata or IDs in checkout.session.completed event', session);
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const planDetails = PLAN_DETAILS[planId];
        
        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeSubscriptionId: stripeSubscriptionId,
            stripeCustomerId: typeof stripeCustomerId === 'string' ? stripeCustomerId : null, // Ensure it's a string
            subscriptionStatus: subscription.status, // e.g., 'active', 'trialing'
            planId: planId,
            credits: (user) => (user.credits || 0) + (planDetails?.credits || 0), // Add credits for the new plan
            subscriptionEndsAt: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
          },
        });
        logger.info(`User ${userId} subscribed to ${planId}. Subscription ID: ${stripeSubscriptionId}`);
        // TODO: Send a welcome email or confirmation
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        logger.info(`Invoice payment succeeded for invoice ID: ${invoice.id}`);
        const stripeSubscriptionId = invoice.subscription;
        const stripeCustomerId = invoice.customer; // This is Stripe Customer ID

        if (!stripeSubscriptionId || !stripeCustomerId) {
            logger.error('Missing subscription or customer ID in invoice.payment_succeeded', invoice);
            break;
        }
        
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const user = await prisma.user.findFirst({ where: { stripeSubscriptionId }});

        if (user) {
          const planDetails = getPlanDetailsById(subscription.items.data[0]?.price.id);
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: subscription.status,
              planId: planDetails?.planId || user.planId, // Update planId if it changed
              credits: (user.credits || 0) + (planDetails?.credits || 0), // Top up credits on renewal
              subscriptionEndsAt: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
            },
          });
          logger.info(`User ${user.id} subscription renewed/payment succeeded. Status: ${subscription.status}`);
        } else {
            logger.warn(`User not found for stripeSubscriptionId: ${stripeSubscriptionId} during invoice.payment_succeeded`);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        logger.warn(`Invoice payment failed for invoice ID: ${invoice.id}`);
        const stripeSubscriptionId = invoice.subscription;
        if (stripeSubscriptionId) {
          const user = await prisma.user.findFirst({ where: { stripeSubscriptionId }});
          if (user) {
            // Update status, e.g., to 'past_due'. Stripe subscription object will reflect this.
            const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
            await prisma.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: subscription.status, // e.g., 'past_due'
              },
            });
            logger.info(`User ${user.id} subscription payment failed. Status updated to ${subscription.status}.`);
            // TODO: Notify user about payment failure
          }
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        logger.info(`Customer subscription updated for subscription ID: ${subscription.id}`);
        const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: subscription.id }});
        if (user) {
          const priceId = subscription.items.data[0]?.price.id;
          const planDetails = getPlanDetailsById(priceId);

          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: subscription.status,
              planId: planDetails?.planId || user.planId, // In case plan changed via portal
              // Credits might need adjustment if plan changed mid-cycle, handle carefully
              subscriptionEndsAt: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
              // If subscription is canceled, cancel_at_period_end will be true.
              // If status is 'canceled', it means it's already ended.
            },
          });
          logger.info(`User ${user.id} subscription updated. New status: ${subscription.status}, Plan: ${planDetails?.planId}`);
        } else {
            logger.warn(`User not found for stripeSubscriptionId: ${subscription.id} during customer.subscription.updated`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        // Occurs when a subscription is canceled immediately or at period end and the period has ended.
        const subscription = event.data.object;
        logger.info(`Customer subscription deleted for subscription ID: ${subscription.id}`);
        const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: subscription.id }});
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: 'canceled', // Or 'expired'
              // planId: null, // Or keep last planId for history
              // stripeSubscriptionId: null, // Optional: clear it or keep for history
              // credits: 0, // Or some grace period credits
              subscriptionEndsAt: new Date(), // Mark as ended now
            },
          });
          logger.info(`User ${user.id} subscription ended/deleted. Status set to canceled.`);
        } else {
            logger.warn(`User not found for stripeSubscriptionId: ${subscription.id} during customer.subscription.deleted`);
        }
        break;
      }
      // ... handle other event types as needed:
      // customer.subscription.trial_will_end
      // payment_intent.succeeded
      // payment_intent.payment_failed
      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`);
    }
  } catch (dbError) {
    logger.error('Error processing Stripe webhook and updating database:', dbError);
    // It's important to respond 200 to Stripe quickly, even if DB update fails,
    // to prevent Stripe from retrying indefinitely for a temporary DB issue.
    // Log thoroughly for manual reconciliation.
    // Consider a retry mechanism for DB updates if critical (e.g., using a job queue).
    return res.status(500).json({ error: "Database update failed after processing webhook."});
  }

  // Return a 200 response to acknowledge receipt of the event
  res.status(200).json({ received: true });
}
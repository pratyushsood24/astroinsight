// astroinsight/src/server/actions/payment.js
import HttpError from '@wasp/core/HttpError.js';
import prisma from '@wasp/db';
import { 
  createStripeCheckoutSession as S_createCheckoutSession,
  createStripePortalSession as S_createPortalSession 
} from '../integrations/stripe.js'; // Renamed to avoid conflict
import { logger } from '../utils/logger.js';
// Stripe instance is initialized in stripe.js, no need to re-init here unless direct calls are made

export const createCheckoutSession = async (args, context) => {
  if (!context.user || !context.user.id) {
    throw new HttpError(401, "User not authenticated.");
  }
  const { planId } = args; // 'basic' or 'premium'
  if (!planId || (planId !== 'basic' && planId !== 'premium')) {
    throw new HttpError(400, "Invalid plan ID specified.");
  }

  try {
    // The S_createCheckoutSession function in stripe.js already handles user context
    const session = await S_createCheckoutSession({ planId }, context);
    logger.info(`Stripe Checkout session created for user ${context.user.id}, plan ${planId}. Session ID: ${session.sessionId}`);
    return session; // { sessionId, url }
  } catch (error) {
    logger.error(`Error creating Stripe Checkout session for user ${context.user.id}:`, error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Failed to create payment session.");
  }
};

export const manageSubscription = async (_args, context) => {
  if (!context.user || !context.user.id) {
    throw new HttpError(401, "User not authenticated.");
  }
  
  const user = await prisma.user.findUnique({ where: { id: context.user.id }});
  if (!user || !user.stripeCustomerId) {
    // If they don't have a stripeCustomerId, they likely haven't subscribed to anything yet.
    // Or, if they are on a 'free_trial' or similar plan not managed by Stripe.
    // Depending on UX, you might redirect them to pricing or show a message.
    throw new HttpError(400, "No active subscription to manage or Stripe customer ID not found.");
  }

  try {
    const portalSession = await S_createPortalSession({}, context); // S_createPortalSession handles user context
    logger.info(`Stripe Portal session created for user ${context.user.id}.`);
    return portalSession; // { portalUrl }
  } catch (error) {
    logger.error(`Error creating Stripe Portal session for user ${context.user.id}:`, error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Failed to create subscription management session.");
  }
};


// cancelSubscription action:
// This action would typically tell Stripe to cancel the subscription at period end.
// The actual update to the user's status in your DB should happen via Stripe webhooks
// (customer.subscription.updated or customer.subscription.deleted events).
// However, you might want to provide immediate feedback or set a local flag.
export const cancelSubscription = async (_args, context) => {
  if (!context.user || !context.user.id) {
    throw new HttpError(401, "User not authenticated.");
  }

  const user = await prisma.user.findUnique({ where: { id: context.user.id } });
  if (!user || !user.stripeSubscriptionId) {
    throw new HttpError(400, "No active Stripe subscription found to cancel.");
  }
  
  // Initialize Stripe here if not already available via context, or import `stripe` object from stripe.js
  const stripeInstance = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);


  try {
    // This cancels the subscription. By default, it prorates and cancels at the end of the billing period.
    // To cancel immediately without proration, use `stripe.subscriptions.del(user.stripeSubscriptionId)`.
    // For "cancel at period end":
    const updatedSubscription = await stripeInstance.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Optionally, update local user status for immediate UI feedback,
    // but webhook is the source of truth.
    // await prisma.user.update({
    //   where: { id: user.id },
    //   data: { subscriptionStatus: 'canceling' }, // A temporary status
    // });

    logger.info(`Stripe subscription ${user.stripeSubscriptionId} for user ${user.id} set to cancel at period end.`);
    return { 
      success: true, 
      message: "Your subscription will be canceled at the end of the current billing period.",
      canceledAtPeriodEnd: updatedSubscription.cancel_at_period_end,
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000)
    };
  } catch (error) {
    logger.error(`Error canceling Stripe subscription ${user.stripeSubscriptionId} for user ${user.id}:`, error);
    // Check for Stripe specific error codes if needed
    throw new HttpError(500, "Failed to cancel subscription. Please try via the Stripe portal or contact support.");
  }
};
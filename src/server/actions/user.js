// astroinsight/src/server/actions/user.js
import HttpError from '@wasp/core/HttpError.js';
import prisma from '@wasp/db';
import { updateProfileSchema } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

export const updateUserProfile = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, "User not authenticated");
  }

  const validatedArgs = updateProfileSchema.safeParse(args);
  if (!validatedArgs.success) {
    throw new HttpError(400, validatedArgs.error.issues.map(i => i.message).join(', '));
  }
  
  const { username } = validatedArgs.data;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: context.user.id },
      data: {
        username: username || context.user.username, // Keep old if not provided
        // Add other fields here
      },
      select: { id: true, email: true, username: true, isAdmin: true, subscriptionStatus: true, planId: true, credits: true } // Return safe fields
    });
    logger.info(`User profile updated for userId: ${context.user.id}`);
    return updatedUser;
  } catch (error) {
    logger.error(`Error updating profile for userId ${context.user.id}:`, error);
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      throw new HttpError(409, "Username already taken.");
    }
    throw new HttpError(500, "Failed to update profile.");
  }
};

export const deleteUserAccount = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "User not authenticated");
  }

  // Potentially complex:
  // 1. Cancel Stripe subscription (if active)
  // 2. Delete Stripe customer object (optional, GDPR)
  // 3. Anonymize or delete user data from app's DB
  //    - User record
  //    - BirthCharts, Conversations, Messages, ApiLogs associated
  //    - This can have cascading effects. Decide on soft vs hard delete.

  // For simplicity, this example does a hard delete.
  // In a real app, consider GDPR compliance and data retention policies.
  // Also, ensure this is not easily triggerable; perhaps require password confirmation.

  const userId = context.user.id;
  logger.warn(`Attempting to delete account for userId: ${userId}`);

  try {
    // Start a transaction to ensure all related data is deleted or none
    await prisma.$transaction(async (tx) => {
      // Delete related data first to avoid foreign key constraint violations
      await tx.apiLog.deleteMany({ where: { userId } });
      await tx.message.deleteMany({ where: { conversation: { userId } } });
      await tx.conversation.deleteMany({ where: { userId } });
      await tx.birthChart.deleteMany({ where: { userId } });
      
      // Finally, delete the user
      await tx.user.delete({ where: { id: userId } });
    });

    logger.info(`User account and associated data deleted for userId: ${userId}`);
    
    // Note: This doesn't log the user out on the client immediately.
    // Wasp's auth might clear the session if the user entity is gone,
    // or the client should handle this by redirecting after calling the action.

    // TODO: Add Stripe subscription cancellation and customer deletion logic here.
    // This would involve calling Stripe API:
    // if (context.user.stripeSubscriptionId) { /* cancel subscription */ }
    // if (context.user.stripeCustomerId) { /* delete customer */ }

    return { success: true, message: "Account deleted successfully." };
  } catch (error) {
    logger.error(`Error deleting account for userId ${userId}:`, error);
    throw new HttpError(500, "Failed to delete account. Please try again later or contact support.");
  }
};
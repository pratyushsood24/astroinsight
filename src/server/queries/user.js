// astroinsight/src/server/queries/user.js
import HttpError from '@wasp/core/HttpError.js';
import prisma from '@wasp/db';
import { logger } from '../utils/logger.js';

export const getCurrentUser = async (_args, context) => {
  if (!context.user) {
    // This query is typically called on authenticated pages,
    // so Wasp's auth should prevent this from being hit by unauth users.
    // However, if called directly without auth context, this check is useful.
    return null; // Or throw new HttpError(401, "Not authenticated");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: context.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        createdAt: true,
        subscriptionStatus: true,
        planId: true,
        credits: true,
        subscriptionEndsAt: true,
        stripeCustomerId: true, // Useful for client-side checks or Stripe Elements
        // Do NOT select hashedPassword or other sensitive fields
      },
    });
    return user;
  } catch (error) {
    logger.error(`Error fetching current user (ID: ${context.user.id}):`, error);
    throw new HttpError(500, "Failed to fetch user data.");
  }
};

export const getUserUsage = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "User not authenticated");
  }

  try {
    const userId = context.user.id;

    // Example usage data: number of charts, conversations, AI calls this month
    const chartsCount = await prisma.birthChart.count({ where: { userId } });
    const conversationsCount = await prisma.conversation.count({ where: { userId } });

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const aiCallsThisMonth = await prisma.apiLog.count({
      where: {
        userId,
        apiService: 'Claude',
        timestamp: { gte: oneMonthAgo },
        isSuccess: true, // Only count successful calls
      },
    });
    
    const totalAiTokensThisMonth = await prisma.apiLog.aggregate({
      _sum: {
        tokenCountIn: true,
        tokenCountOut: true,
      },
      where: {
        userId,
        apiService: 'Claude',
        timestamp: { gte: oneMonthAgo },
        isSuccess: true,
      }
    });

    const usageData = {
      chartsCreated: chartsCount,
      conversationsStarted: conversationsCount,
      aiCallsThisMonth: aiCallsThisMonth,
      aiTokensUsedThisMonth: (totalAiTokensThisMonth._sum.tokenCountIn || 0) + (totalAiTokensThisMonth._sum.tokenCountOut || 0),
      creditsRemaining: context.user.credits, // Assuming credits are up-to-date on user object
      // Add more specific usage metrics as needed
    };

    logger.info(`Fetched usage data for user ${userId}`);
    return usageData;

  } catch (error) {
    logger.error(`Error fetching usage data for user ${context.user.id}:`, error);
    throw new HttpError(500, "Failed to fetch usage data.");
  }
};
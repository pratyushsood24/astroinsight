// astroinsight/src/server/queries/astrology.js
import HttpError from '@wasp/core/HttpError.js';
import prisma from '@wasp/db';
import { logger } from '../utils/logger.js';

export const getUserBirthCharts = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "User not authenticated");
  }

  try {
    const birthCharts = await prisma.birthChart.findMany({
      where: { userId: context.user.id },
      orderBy: { createdAt: 'desc' },
      select: { // Select only necessary fields for listing
        id: true,
        name: true,
        birthDate: true,
        birthTime: true,
        birthLocation: true,
        createdAt: true,
      },
    });
    return birthCharts;
  } catch (error) {
    logger.error(`Error fetching birth charts for user ${context.user.id}:`, error);
    throw new HttpError(500, "Failed to fetch birth charts.");
  }
};

export const getBirthChartDetails = async ({ id: chartId }, context) => {
  if (!context.user) {
    throw new HttpError(401, "User not authenticated");
  }
  if (!chartId) {
    throw new HttpError(400, "Chart ID is required.");
  }

  try {
    const birthChart = await prisma.birthChart.findFirst({
      where: { 
        id: chartId,
        // Ensure user owns the chart, or if admin, allow access (context.user.isAdmin)
        OR: [
            { userId: context.user.id },
            { user: { isAdmin: context.user.isAdmin ? true : undefined } } // Only apply isAdmin if true
        ]
      },
    });

    if (!birthChart) {
      throw new HttpError(404, "Birth chart not found or access denied.");
    }

    // Parse the JSON data before sending to client
    // The raw JSON can be large; consider if client needs all of it or a summary
    let planetaryPositions = null;
    if (birthChart.planetaryPositionsJson) {
      try {
        planetaryPositions = JSON.parse(birthChart.planetaryPositionsJson);
      } catch (parseError) {
        logger.error(`Error parsing planetaryPositionsJson for chart ${chartId}:`, parseError);
        throw new HttpError(500, "Failed to parse chart data.");
      }
    }
    
    // Omit the large JSON string from the main returned object if sending parsed version
    const { planetaryPositionsJson, ...chartDetails } = birthChart;

    return { ...chartDetails, planetaryPositions };
  } catch (error) {
    logger.error(`Error fetching birth chart details for chart ${chartId}, user ${context.user.id}:`, error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Failed to fetch birth chart details.");
  }
};

export const getUserConversations = async ({ birthChartId }, context) => {
  if (!context.user) {
    throw new HttpError(401, "User not authenticated");
  }

  const whereClause = { userId: context.user.id };
  if (birthChartId) {
    whereClause.birthChartId = birthChartId;
  }

  try {
    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        birthChartId: true,
        _count: { select: { messages: true } }, // Get message count
      },
    });
    return conversations;
  } catch (error) {
    logger.error(`Error fetching conversations for user ${context.user.id}:`, error);
    throw new HttpError(500, "Failed to fetch conversations.");
  }
};

export const getConversationMessages = async ({ conversationId }, context) => {
  if (!context.user) {
    throw new HttpError(401, "User not authenticated");
  }
  if (!conversationId) {
    throw new HttpError(400, "Conversation ID is required.");
  }

  try {
    // First, verify the user owns the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: context.user.id,
      },
    });

    if (!conversation) {
      throw new HttpError(404, "Conversation not found or access denied.");
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        role: true,
        createdAt: true,
        modelUsed: true,
        // tokenCount and cost might be sensitive or not always needed by client
      },
    });
    return messages;
  } catch (error) {
    logger.error(`Error fetching messages for conversation ${conversationId}, user ${context.user.id}:`, error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Failed to fetch messages.");
  }
};
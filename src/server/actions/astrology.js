// astroinsight/src/server/actions/astrology.js
import HttpError from '@wasp/core/HttpError.js';
import prisma from '@wasp/db';
import { geocodeAddress, getTimezone } from '../integrations/geolocation.js';
import { calculateBirthChartData } from '../integrations/ephemeris.js';
import { getClaudeInsight, SYSTEM_PROMPTS } from '../integrations/claude.js';
import { birthInfoSchema, astrologyQuestionSchema } from '../utils/validation.js';
import { logger } from '../utils/logger.js';
import { formatBirthChartDataAsXML } from '../utils/astroLogic.js'; // We'll create this util

const FREE_TRIAL_CHART_LIMIT = 1;
const FREE_TRIAL_AI_INSIGHTS_LIMIT = 3; // Total AI interactions for free trial.
const BASIC_PLAN_CHART_LIMIT = 3;

// Helper to check user's plan and limits
async function checkUserLimits(userId, actionType) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { birthCharts: true } } }
  });

  if (!user) throw new HttpError(404, "User not found.");

  if (actionType === 'createChart') {
    if ((!user.planId || user.planId === 'free_trial') && user._count.birthCharts >= FREE_TRIAL_CHART_LIMIT) {
      throw new HttpError(403, "Free trial limit of 1 birth chart reached. Please upgrade to create more charts.");
    }
    if (user.planId === 'basic' && user._count.birthCharts >= BASIC_PLAN_CHART_LIMIT) {
      throw new HttpError(403, "Basic plan limit of 3 birth charts reached. Please upgrade for unlimited charts.");
    }
  }

  if (actionType === 'aiInsight') {
    if ((!user.planId || user.planId === 'free_trial') && (user.credits || 0) <= 0) {
       throw new HttpError(403, "Free trial AI insight limit reached. Please upgrade for more insights.");
    }
    if (user.planId === 'basic' && (user.credits || 0) <= 0) {
       throw new HttpError(403, "Basic plan AI credit limit reached. Please upgrade or wait for next cycle.");
    }
  }
  return user;
}

// Helper to decrement credits
async function decrementUserCredits(userId, amount = 1) {
  // Only decrement if not on premium plan (unlimited)
  const user = await prisma.user.findUnique({ where: { id: userId }});
  if (user && user.planId !== 'premium') {
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
    });
  }
}

export const createBirthChart = async (args, context) => {
  if (!context.user) throw new HttpError(401, "User not authenticated.");

  const user = await checkUserLimits(context.user.id, 'createChart');

  const validatedArgs = birthInfoSchema.safeParse(args);
  if (!validatedArgs.success) {
    throw new HttpError(400, validatedArgs.error.issues.map(i => i.message).join(', '));
  }
  const { name, birthDate, birthTime, birthLocation, gender } = validatedArgs.data;

  try {
    // 1. Geocode address to get lat/lng
    const geoData = await geocodeAddress(birthLocation, user.id);
    if (!geoData) {
      throw new HttpError(400, `Could not find location: ${birthLocation}. Please be more specific.`);
    }
    const { latitude, longitude, formattedAddress } = geoData;

    // 2. Get timezone for lat/lng and birthDate
    // Birth date string needs to be parsed to a Date object for getTimezone
    const dateObj = new Date(birthDate); // Assumes YYYY-MM-DD is UTC midnight or local, be careful
    const tzData = await getTimezone(latitude, longitude, dateObj, user.id);
    if (!tzData || !tzData.timeZoneId) {
      throw new HttpError(400, `Could not determine timezone for ${formattedAddress}.`);
    }
    const timezone = tzData.timeZoneId;

    // 3. Calculate astrological data using Swiss Ephemeris
    // Note: birthDate is string 'YYYY-MM-DD', birthTime is 'HH:MM'
    const chartRawData = await calculateBirthChartData(
      birthDate, // Pass as string
      birthTime,
      latitude,
      longitude,
      timezone,
      'P', // Placidus house system by default
      user.planId === 'premium' ? 'Lahiri' : 'Lahiri' // Example: default Ayanamsa, maybe configurable later
    );

    // 4. Store in database
    const newChart = await prisma.birthChart.create({
      data: {
        userId: user.id,
        name,
        birthDate: new Date(`${birthDate}T${birthTime}:00Z`), // Store as UTC; this might need timezone adjustment logic before saving if not already UTC from date picker
        // A better way for birthDate: combine date string and time string using the determined timezone, then convert to UTC Date object
        // Example: const localDateTime = zonedTimeToUtc(`${birthDate}T${birthTime}`, timezone); newChart.birthDate = localDateTime;
        birthTime, // Store original time string
        birthLocation: formattedAddress, // Use formatted address from geocoding
        latitude,
        longitude,
        timezone,
        gender,
        planetaryPositionsJson: JSON.stringify(chartRawData), // Store all calculated data
        // houseSystem, ayanamsa can be stored if they vary
      },
    });

    logger.info(`Birth chart created for user ${user.id}, chart ID: ${newChart.id}`);

    // If it's the first chart for a free user, generate initial insight
    if ((!user.planId || user.planId === 'free_trial') && user._count.birthCharts === 0) {
        await decrementUserCredits(user.id); // Use one free credit for initial insight
        // No need to call getAstrologyReport action, just call the claude part.
        const chartDataForXML = { ...chartRawData, name, gender };
        const xmlChartData = formatBirthChartDataAsXML(chartDataForXML);
        const systemPrompt = SYSTEM_PROMPTS.BIRTH_CHART_ANALYSIS;
        const messages = [{ role: 'user', content: `<birth_chart_data>${xmlChartData}</birth_chart_data>\nPlease provide a birth chart analysis.` }];
        
        const aiResponse = await getClaudeInsight(systemPrompt, messages, user.planId || 'free_trial', user.id);

        // Create conversation and message for this initial report
        const conversation = await prisma.conversation.create({
            data: {
                userId: user.id,
                birthChartId: newChart.id,
                title: `Initial Insight for ${name}`,
            }
        });
        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: 'assistant',
                content: aiResponse.content,
                modelUsed: aiResponse.modelUsed,
                tokenCount: (aiResponse.usage?.input_tokens || 0) + (aiResponse.usage?.output_tokens || 0),
                cost: aiResponse.cost,
            }
        });
        logger.info(`Initial insight generated for new chart ${newChart.id} for free trial user ${user.id}`);
    }


    return { ...newChart, planetaryPositions: chartRawData }; // Return full data to client for immediate display

  } catch (error) {
    logger.error(`Error creating birth chart for user ${user.id}:`, error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, error.message || "Failed to create birth chart.");
  }
};

export const getAstrologyReport = async (args, context) => {
  if (!context.user) throw new HttpError(401, "User not authenticated.");
  
  const { birthChartId, analysisType = "BIRTH_CHART_ANALYSIS" } = args; // analysisType could be enum
  if (!birthChartId) throw new HttpError(400, "Birth chart ID is required.");

  const user = await checkUserLimits(context.user.id, 'aiInsight');

  const birthChart = await prisma.birthChart.findUnique({
    where: { id: birthChartId, userId: user.id }, // Ensure user owns the chart
  });

  if (!birthChart) {
    throw new HttpError(404, "Birth chart not found or access denied.");
  }
  if (!birthChart.planetaryPositionsJson) {
    throw new HttpError(500, "Birth chart data is missing or corrupted.");
  }

  try {
    const chartRawData = JSON.parse(birthChart.planetaryPositionsJson);
    const chartDataForXML = { ...chartRawData, name: birthChart.name, gender: birthChart.gender };
    const xmlChartData = formatBirthChartDataAsXML(chartDataForXML);
    
    const systemPrompt = SYSTEM_PROMPTS[analysisType] || SYSTEM_PROMPTS.BIRTH_CHART_ANALYSIS;
    const messages = [{ role: 'user', content: `<birth_chart_data>${xmlChartData}</birth_chart_data>\nPlease provide a ${analysisType.toLowerCase().replace(/_/g, ' ')}.` }];

    await decrementUserCredits(user.id);
    const aiResponse = await getClaudeInsight(systemPrompt, messages, user.planId || 'free_trial', user.id);

    // Store this report as a new conversation or add to existing one
    // For a full "report", typically start a new conversation
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        birthChartId: birthChart.id,
        title: `${analysisType.replace(/_/g, ' ')} for ${birthChart.name}`,
      }
    });
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant', // This is the AI's report
        content: aiResponse.content,
        modelUsed: aiResponse.modelUsed,
        tokenCount: (aiResponse.usage?.input_tokens || 0) + (aiResponse.usage?.output_tokens || 0),
        cost: aiResponse.cost,
      }
    });

    logger.info(`Astrology report (${analysisType}) generated for chart ${birthChartId}, user ${user.id}`);
    return { report: aiResponse.content, conversationId: conversation.id, modelUsed: aiResponse.modelUsed };

  } catch (error) {
    logger.error(`Error generating astrology report for chart ${birthChartId}, user ${user.id}:`, error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, error.message || "Failed to generate astrology report.");
  }
};

export const askAstrologyQuestion = async (args, context) => {
  if (!context.user) throw new HttpError(401, "User not authenticated.");

  const validatedArgs = astrologyQuestionSchema.safeParse(args);
  if (!validatedArgs.success) {
    throw new HttpError(400, validatedArgs.error.issues.map(i => i.message).join(', '));
  }
  const { birthChartId, conversationId, question, analysisType } = validatedArgs.data;
  
  const user = await checkUserLimits(context.user.id, 'aiInsight');

  const birthChart = await prisma.birthChart.findUnique({
    where: { id: birthChartId, userId: user.id },
  });
  if (!birthChart) throw new HttpError(404, "Birth chart not found or access denied.");
  if (!birthChart.planetaryPositionsJson) throw new HttpError(500, "Birth chart data is missing.");

  let convId = conversationId;
  let existingMessages = [];

  try {
    // Create or fetch conversation
    if (convId) {
      const existingConv = await prisma.conversation.findUnique({ 
        where: { id: convId, userId: user.id },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 10 }} // Get last 10 messages for context
      });
      if (!existingConv) throw new HttpError(404, "Conversation not found.");
      existingMessages = existingConv.messages.map(m => ({ role: m.role, content: m.content }));
    } else {
      const newConv = await prisma.conversation.create({
        data: {
          userId: user.id,
          birthChartId: birthChart.id,
          title: question.substring(0, 50) + (question.length > 50 ? '...' : ''), // Title from first question
        }
      });
      convId = newConv.id;
    }

    // Store user's question
    await prisma.message.create({
      data: {
        conversationId: convId,
        role: 'user',
        content: question,
      }
    });

    const chartRawData = JSON.parse(birthChart.planetaryPositionsJson);
    const chartDataForXML = { ...chartRawData, name: birthChart.name, gender: birthChart.gender };
    const xmlChartData = formatBirthChartDataAsXML(chartDataForXML);
    
    // Construct messages for Claude, including history
    const messagesForClaude = [
      ...existingMessages,
      { role: 'user', content: `<birth_chart_data>${xmlChartData}</birth_chart_data>\n<user_query>${question}</user_query>` }
    ];
    
    // Determine system prompt - if specific analysis type provided, use it, else a general astrology Q&A prompt
    // For a general Q&A, might need a new prompt or adapt one. Using BIRTH_CHART_ANALYSIS as a fallback.
    const systemPromptKey = analysisType || (existingMessages.length === 0 ? "BIRTH_CHART_ANALYSIS" : "CONVERSATIONAL_ASTROLOGER");
    // Add a CONVERSATIONAL_ASTROLOGER prompt to SYSTEM_PROMPTS in claude.js if needed for follow-ups
    // For now, using BIRTH_CHART_ANALYSIS if no analysisType and it's a new question.
    // If there's history, the context is already somewhat set.
    let systemPrompt = SYSTEM_PROMPTS[systemPromptKey] || SYSTEM_PROMPTS.BIRTH_CHART_ANALYSIS;
    if (existingMessages.length > 0 && !analysisType) {
        // If it's a follow-up, the system prompt might be simpler or just refer to the ongoing context
        systemPrompt = `You are an insightful astrologer continuing a conversation. The user's birth chart details are in prior messages or provided again. Address the user's latest query: <user_query>${question}</user_query> based on the astrological chart and previous discussion. Be concise and relevant.`;
    }


    await decrementUserCredits(user.id);
    const aiResponse = await getClaudeInsight(systemPrompt, messagesForClaude, user.planId || 'free_trial', user.id);

    // Store AI's answer
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: convId,
        role: 'assistant',
        content: aiResponse.content,
        modelUsed: aiResponse.modelUsed,
        tokenCount: (aiResponse.usage?.input_tokens || 0) + (aiResponse.usage?.output_tokens || 0),
        cost: aiResponse.cost,
      }
    });

    logger.info(`AI question answered for chart ${birthChartId}, user ${user.id}, conversation ${convId}`);
    return {
      answer: assistantMessage.content,
      messageId: assistantMessage.id,
      conversationId: convId,
      modelUsed: aiResponse.modelUsed,
      creditsRemaining: (await prisma.user.findUnique({where: {id: user.id}})).credits // fetch updated credits
    };

  } catch (error) {
    logger.error(`Error asking astrology question for chart ${birthChartId}, user ${user.id}:`, error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, error.message || "Failed to get answer from AI astrologer.");
  }
};

export const deleteBirthChart = async ({ id: chartId }, context) => {
  if (!context.user) throw new HttpError(401, "User not authenticated.");
  if (!chartId) throw new HttpError(400, "Chart ID is required.");

  const chart = await prisma.birthChart.findUnique({ where: { id: chartId }});

  if (!chart) throw new HttpError(404, "Birth chart not found.");
  if (chart.userId !== context.user.id && !context.user.isAdmin) { // Allow admin to delete any chart
    throw new HttpError(403, "You do not have permission to delete this chart.");
  }

  try {
    // Must delete related messages and conversations first, or use cascading delete in Prisma schema
    // For now, assuming manual deletion order or that schema handles it (e.g. onDelete: Cascade)
    // If not, this will fail due to foreign key constraints.
    // Add onDelete: Cascade in main.wasp for Conversation.birthChartId if appropriate
    // For now, let's manually delete related items:
    await prisma.message.deleteMany({ where: { conversation: { birthChartId: chartId }}});
    await prisma.conversation.deleteMany({ where: { birthChartId: chartId }});
    await prisma.birthChart.delete({ where: { id: chartId }});
    
    logger.info(`Birth chart ${chartId} deleted by user ${context.user.id}`);
    return { success: true, message: "Birth chart deleted successfully." };
  } catch (error) {
    logger.error(`Error deleting birth chart ${chartId} by user ${context.user.id}:`, error);
    throw new HttpError(500, "Failed to delete birth chart.");
  }
};
// astroinsight/src/server/jobs/monthlyHoroscope.js
import prisma from '@wasp/db';
import { logger } from '../utils/logger.js';
import { getClaudeInsight, SYSTEM_PROMPTS } from '../integrations/claude.js';
import { calculateBirthChartData } from '../integrations/ephemeris.js'; // For transits if needed
import { formatBirthChartDataAsXML, formatTransitDataAsXML } from '../utils/astroLogic.js';

// This is a Wasp Job, defined in main.wasp to run on a schedule.
// It will be executed by the Wasp job runner.

// Helper to simulate fetching current transit data for a given date (e.g., mid-month)
// In a real scenario, you'd calculate this for the relevant period.
async function getTransitDataForMonth(dateForMonth = new Date()) {
  // For simplicity, let's assume "general transits" not tied to a specific location for this generic horoscope.
  // Or, one could calculate for a generic point like 0 Lat/0 Lon, or a capital city.
  // This is a placeholder. A real transit report needs more specific calculations.
  // For this example, we'll just create a dummy transit data object.
  // Ideally, you'd use sweph.swe_calc_ut for current planetary positions for a specific date.
  // Let's say we calculate for the 15th of the current month.
  const targetDate = new Date(dateForMonth.getFullYear(), dateForMonth.getMonth(), 15);
  const jdutTransit = sweph.swe_utc_to_jd(
    targetDate.getUTCFullYear(), targetDate.getUTCMonth() + 1, targetDate.getUTCDate(),
    12, 0, 0, // Noon UTC
    sweph.SE_GREG_CAL
  ).jdut;

  const transitPlanets = {};
  const planetIds = [
    sweph.SE_SUN, sweph.SE_MOON, sweph.SE_MERCURY, sweph.SE_VENUS, sweph.SE_MARS, 
    sweph.SE_JUPITER, sweph.SE_SATURN, sweph.SE_URANUS, sweph.SE_NEPTUNE, sweph.SE_PLUTO,
    sweph.SE_MEAN_NODE
  ];
  
  // Using tropical positions for general transits usually
  sweph.swe_set_sid_mode(0,0,0); // Ensure tropical
  const flags = sweph.SEFLG_SPEED;

  for (const id of planetIds) {
    const { xx } = sweph.swe_calc_ut(jdutTransit, id, flags);
    const planetName = Object.keys(PLANET_LIST).find(key => PLANET_LIST[key] === id) || `Planet_${id}`;
     transitPlanets[planetName] = { longitude: xx[0], speedLon: xx[3] }; // Simplified
  }
  sweph.swe_close();
  return { date: targetDate.toISOString().split('T')[0], planets: transitPlanets };
}


export const generateMonthlyHoroscopes = async (_args, context) => {
  // This job doesn't have direct user context but can access `context.entities`.
  logger.info('Starting monthly horoscope generation job...');

  // Get all users who are subscribed to premium (or a specific horoscope service)
  const premiumUsers = await prisma.user.findMany({
    where: {
      planId: 'premium', // Or a specific flag like 'wantsMonthlyHoroscope: true'
      subscriptionStatus: 'active', // Ensure they are active subscribers
    },
    include: {
      birthCharts: {
        where: { planetaryPositionsJson: { not: null } }, // Only charts with data
      },
    },
  });

  if (premiumUsers.length === 0) {
    logger.info('No premium users found for monthly horoscopes. Exiting job.');
    return;
  }
  
  const currentMonthStr = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  let horoscopesGenerated = 0;

  // Get general transit data for the upcoming month
  // This is a simplification; sophisticated transits would be more complex.
  // For a real service, you might calculate transits specific to each user's location,
  // or at least relative to their natal chart from their location.
  // For this example, we'll generate a generic "transit weather" report.
  // For a more personalized report, we'd need to pass natal chart + transit data to Claude.
  const transitData = await getTransitDataForMonth(); // Placeholder for actual transit calculation logic
  const xmlTransitData = formatTransitDataAsXML(transitData);

  for (const user of premiumUsers) {
    if (user.birthCharts.length === 0) {
      logger.info(`User ${user.id} (${user.email}) has no birth charts. Skipping.`);
      continue;
    }

    // Typically, a monthly horoscope might be general for their Sun sign,
    // or more personalized if based on their full natal chart + transits.
    // We'll aim for the latter for premium users.
    // For simplicity, let's use their first available birth chart.
    const primaryChart = user.birthCharts[0];
    try {
      const chartRawData = JSON.parse(primaryChart.planetaryPositionsJson);
      const chartDataForXML = formatBirthChartDataAsXML({ ...chartRawData, name: primaryChart.name, gender: primaryChart.gender });
      
      const systemPrompt = SYSTEM_PROMPTS.PREDICTIONS_TRANSITS;
      const messages = [{ 
        role: 'user', 
        content: `Please provide a personalized monthly astrological forecast for ${currentMonthStr} based on the following natal chart and transit data.\n<natal_chart_data>${chartDataForXML}</natal_chart_data>\n<transit_data>${xmlTransitData}</transit_data>\nFocus on key themes for the month.` 
      }];

      // Use premium model for premium users
      const aiResponse = await getClaudeInsight(systemPrompt, messages, 'premium', user.id);

      // Store this horoscope. Could be a new type of entity, or a special Conversation/Message.
      // Let's create a new conversation for it.
      const conversationTitle = `Your Monthly Horoscope: ${currentMonthStr}`;
      const conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          birthChartId: primaryChart.id, // Link to the chart used
          title: conversationTitle,
        },
      });

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: aiResponse.content,
          modelUsed: aiResponse.modelUsed,
          tokenCount: (aiResponse.usage?.input_tokens || 0) + (aiResponse.usage?.output_tokens || 0),
          cost: aiResponse.cost, // Track costs even for scheduled jobs
        },
      });
      
      horoscopesGenerated++;
      logger.info(`Generated monthly horoscope for user ${user.id}, chart ${primaryChart.id}.`);

      // TODO: Send an email notification to the user about their new horoscope.
      // Use SendGrid integration: e.g., sendEmail({ to: user.email, subject: conversationTitle, html: "..." })

    } catch (error) {
      logger.error(`Failed to generate horoscope for user ${user.id}, chart ${primaryChart.id}:`, error);
      // Log to ApiLog as a failed attempt if appropriate
      await prisma.apiLog.create({
          data: {
            userId: user.id,
            apiService: 'ClaudeJob',
            endpoint: 'MonthlyHoroscope',
            isSuccess: false,
            errorMessage: error.message,
          }
      });
    }
  }

  logger.info(`Monthly horoscope generation job finished. ${horoscopesGenerated} horoscopes generated.`);
};

// Add PLANET_LIST and PLANET_NAMES constants from ephemeris.js if sweph is used directly in job.
// For brevity, assuming they are accessible or job specific logic for planet names.
const PLANET_LIST = { SE_SUN: 0, SE_MOON: 1, SE_MERCURY: 2, SE_VENUS: 3, SE_MARS: 4, SE_JUPITER: 5, SE_SATURN: 6, SE_URANUS: 7, SE_NEPTUNE: 8, SE_PLUTO: 9, SE_MEAN_NODE: 10 };

// Import sweph for transit calculations
import sweph from 'sweph-js';
const SWEPH_PATH = process.env.SWEPH_PATH;
if (SWEPH_PATH) sweph.swe_set_ephe_path(SWEPH_PATH);
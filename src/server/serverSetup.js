// astroinsight/src/server/serverSetup.js
import http from 'http';
import { logger } from './utils/logger.js'; // We'll create this logger utility

/**
 * This function is called by Wasp when the server is starting.
 * It's a good place to initialize any services or configurations
 * that need to happen once at server startup.
 *
 * @param {object} app - The Express app instance. Wasp uses Express.js under the hood.
 * @param {object} http - The Node.js http module.
 * @param {object} config - The Wasp configuration object.
 */
export const setupServer = async (app /*, http, config */) => {
  logger.info('🚀 AstroInsight Server is starting up...');

  // Initialize any external services here if needed
  // For example, connect to a monitoring service, or warm up a cache.

  // Example: Swiss Ephemeris path check (optional, sweph-js might handle it)
  if (process.env.SWEPH_PATH) {
    logger.info(`Swiss Ephemeris path set to: ${process.env.SWEPH_PATH}`);
    // You could add a check here to see if the path is valid or files exist,
    // but sweph-js will likely throw an error if it can't find them.
  } else {
    logger.warn(
      'SWEPH_PATH environment variable is not set. sweph-js will try to use its default path or bundled data.'
    );
  }

  // Example: Check for essential API keys
  const essentialKeys = [
    'CLAUDE_API_KEY',
    'STRIPE_SECRET_KEY',
    'GOOGLE_MAPS_API_KEY',
    'SENDGRID_API_KEY',
  ];
  essentialKeys.forEach((key) => {
    if (!process.env[key]) {
      logger.warn(`⚠️ Environment variable ${key} is not set. Some features may not work.`);
    }
  });

  logger.info('✅ AstroInsight Server setup complete.');

  // You can add custom middleware to the Express app instance if needed,
  // though Wasp's `server.middleware` in main.wasp is often preferred.
  // app.use((req, res, next) => {
  //   logger.info(`Received request: ${req.method} ${req.url}`);
  //   next();
  // });
};

// This function is called when the server is shutting down.
// It's a good place to clean up resources.
export const shutdownServer = async () => {
  logger.info('🌙 AstroInsight Server is shutting down...');
  // Perform any cleanup tasks, e.g., close database connections if not managed by Prisma/Wasp.
  // Prisma handles its own connection pooling and shutdown.
  logger.info('👋 AstroInsight Server shutdown complete.');
};


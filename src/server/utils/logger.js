// astroinsight/src/server/utils/logger.js
import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const developmentFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }), // Log stack trace for errors
  logFormat
);

const productionFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json() // Log in JSON format for production for easier parsing by log management systems
);

const transports = [
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
    level: process.env.LOG_LEVEL || 'info', // Default to 'info' if LOG_LEVEL is not set
  }),
  // TODO: Add other transports for production if needed, e.g., file transport or cloud logging service
  // new winston.transports.File({ filename: 'error.log', level: 'error' }),
  // new winston.transports.File({ filename: 'combined.log' }),
];

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  transports,
  exitOnError: false, // Do not exit on handled exceptions
});

// Stream for Morgan (HTTP request logger) if you decide to use it with Express directly
// export const stream = {
//   write: (message) => {
//     logger.info(message.substring(0, message.lastIndexOf('\n')));
//   },
// };

logger.info(`Logger initialized with level: ${logger.level}`);
if (process.env.NODE_ENV === 'production') {
  logger.info('Production logging format enabled (JSON).');
} else {
  logger.info('Development logging format enabled (colorize, human-readable).');
}
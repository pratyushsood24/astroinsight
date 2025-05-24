// astroinsight/src/server/middleware/errorHandler.js
import { logger } from '../utils/logger.js';

/**
 * Custom global error handling middleware for Express.
 * Wasp might have its own layers, but this can be added for more control if needed
 * via `server.middleware` in `main.wasp` or by attaching to specific routes/actions
 * if Wasp's action/query error handling isn't sufficient.
 *
 * Note: Wasp's actions and queries automatically handle errors and return
 * appropriate HTTP status codes (e.g., HttpError becomes a 4xx/5xx response).
 * This middleware would be more for custom Express routes you might add outside Wasp's RPC.
 * For Wasp actions/queries, the HttpError mechanism is preferred.
 */
export const globalErrorHandler = (err, req, res, next) => {
  logger.error('Global Error Handler Caught:', {
    message: err.message,
    stack: err.stack,
    status: err.status,
    path: req.path,
    method: req.method,
  });

  // If err is an HttpError from @wasp/core/HttpError, it will have status and message
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Avoid sending stack trace to client in production
  const responseError = process.env.NODE_ENV === 'production'
    ? { message }
    : { message, stack: err.stack };

  // If headers already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json({ error: responseError });
};

// If you want to apply this to specific custom routes or globally:
// In main.wasp -> server.setupFn:
// app.use(globalErrorHandler); // To make it global for all Express routes managed by app.
// However, be cautious as this might interfere with Wasp's own error handling for actions/queries.
// Wasp's `HttpError` is the standard way to signal errors from actions/queries.
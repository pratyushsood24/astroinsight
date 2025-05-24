// astroinsight/src/server/middleware/rateLimiter.js
import { rateLimit } from 'express-rate-limit'; // `npm install express-rate-limit` -> add to main.wasp dependencies
import { logger } from '../utils/logger.js';

// Add "express-rate-limit" to main.wasp dependencies: ("express-rate-limit", "^7.1.5")

// Example: Basic rate limiter for all API requests (actions, queries, api routes)
// This would be applied globally in server.setupFn or to specific routes.
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP ${req.ip}: ${req.method} ${req.url}`);
    res.status(options.statusCode).json(options.message);
  },
  // TODO: Could use a store like Redis for distributed environments (Railway deployments)
  // store: new RedisStore({ client: redisClient })
});

// Example: Stricter rate limiter for sensitive actions like login/signup attempts
export const authRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 auth attempts per hour
  message: { error: 'Too many authentication attempts, please try again later.' },
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP ${req.ip}: ${req.method} ${req.url}`);
    res.status(options.statusCode).json(options.message);
  },
  // Important: This should ideally be applied *before* Wasp's auth middleware
  // or within the auth action logic if possible. Applying it as general middleware might be tricky with Wasp.
  // Wasp actions don't directly expose Express req/res for middleware in the same way for individual actions.
  // A common pattern is to implement rate limiting logic *inside* the action itself using an IP-based store.
});


// How to use with Wasp:
// 1. Global (in serverSetup.js):
//    app.use('/api', apiRateLimiter); // If all Wasp actions/queries are under /api (check Wasp routing)
//    This might be too broad or interfere.
// 2. Per Action/Query (more complex, might need custom logic within action):
//    Wasp currently doesn't have a declarative way to add Express middleware per action/query.
//    You would implement the rate-limiting logic *inside* the action/query functions,
//    perhaps using a library like `rate-limiter-flexible` that is not Express-middleware-dependent.
//    const { RateLimiterMemory } = require('rate-limiter-flexible');
//    const limiter = new RateLimiterMemory({ points: 10, duration: 15 * 60 });
//    Inside action: try { await limiter.consume(context.user?.id || req.ip); } catch (e) { throw new HttpError(429, ...); }
//    Getting req.ip inside an action needs Wasp to pass it to context, or use a custom wrapper.

// For `api stripeWebhook`, you can potentially add middleware in `main.wasp` if Wasp supports it for `api` routes.
// If not, then `stripeWebhookHandler` should implement its own rate limiting if necessary, although Stripe webhooks are usually trusted.
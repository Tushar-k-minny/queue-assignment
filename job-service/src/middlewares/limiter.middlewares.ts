import rateLimit from "express-rate-limit";
import type { AuthenticatedRequest } from "./auth.middleware.js";

// Rate limiter for job creation - 10 jobs per minute per user
const createJobLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthenticatedRequest) => {
    return req.user?.userId || req.ip || 'anonymous';
  },
  handler: (_, res) => {
    res.status(429).json({
      error: 'Too many jobs created',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: 60,
    });
  },
  skip: (req) => {
    // Skip rate limiting for internal service calls
    return req.headers['x-service-token'] !== undefined;
  },
});

// Rate limiter for job queries - 100 requests per minute per user
const queryJobLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthenticatedRequest) => {
    return req.user?.userId || req.ip || 'anonymous';
  },
  handler: (_, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: 60,
    });
  },
});

export default queryJobLimiter
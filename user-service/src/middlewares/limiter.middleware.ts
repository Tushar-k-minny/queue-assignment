import type { Request, Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const createUsers = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: {
    error: "Too many accounts created",
    message:
      "You have exceeded the registration limit. Please try again later.",
    retryAfter: 3600, // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (req: Request) => {
    // Use IP address as the key
    return ipKeyGenerator(req.ip || "unknown");
  },
  handler: (_: Request, res: Response) => {
    res.status(429).json({
      error: "Too many accounts created",
      message: "Registration limit exceeded. Please try again in 1 hour.",
      retryAfter: 3600,
    });
  },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes per IP
  message: {
    error: "Too many login attempts",
    message: "Account temporarily locked. Please try again later.",
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  keyGenerator: (req: Request) => {
    const email = req.body?.email || "";
    return `${ipKeyGenerator(req.ip || "unknown")}-${email}`;
  },
  handler: (_: Request, res: Response) => {
    res.status(429).json({
      error: "Too many login attempts",
      message:
        "Too many failed login attempts. Please try again in 15 minutes.",
      retryAfter: 900,
    });
  },
});

export const refreshTokenLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 refresh requests per 5 minutes
  message: {
    error: "Too many refresh requests",
    message: "Please wait before refreshing your token again.",
    retryAfter: 300,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
  return ipKeyGenerator(req.ip || "unknown");
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Too many refresh requests",
      message: "Rate limit exceeded. Please try again in 5 minutes.",
      retryAfter: 300,
    });
  },
});

export const authenticatedLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: "Too many requests",
    message: "Rate limit exceeded. Please slow down.",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    //biome-ignore lint/suspicious/noExplicitAny: user should be defined
    const user = (req as any).user;
    if(user?.userId) { return user.userId; }
    return ipKeyGenerator(req.ip || "unknown");
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: "Too many requests",
      message: "You are making too many requests. Please slow down.",
      retryAfter: 60,
    });
  },
});

export const internalServiceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute (very high limit)
  message: {
    error: "Service rate limit exceeded",
    message: "Internal service rate limit exceeded.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use service identifier or IP
    const serviceId = req.headers["x-service-id"] as string;
    return serviceId || ipKeyGenerator(req.ip || "unknown");
  },
  skip: (req: Request) => {
    // Skip rate limiting if valid service token is present
    const serviceToken = req.headers["x-service-token"];
    const expectedToken = process.env.SERVICE_SECRET_TOKEN;
    return serviceToken === expectedToken;
  },
});

export default {
  createUsers,
  loginLimiter,
  refreshTokenLimiter,
  authenticatedLimiter,
  internalServiceLimiter,
};

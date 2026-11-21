import rateLimit from 'express-rate-limit';

/**
 * Protects public deployment on Cloud Run from budget drain / spam
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait a few minutes and try again.',
  },
});

import { rateLimit } from 'express-rate-limit';

/**
 * Slows down password guessing. Successful requests don't count, so the staff
 * sharing the hostal's public IP never use up each other's quota.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos. Inténtalo de nuevo en 15 minutos.' },
  },
});

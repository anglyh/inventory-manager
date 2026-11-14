import { rateLimit } from 'express-rate-limit';

/**
 * Slows down password guessing, per IP. Only wrong credentials count, so normal
 * logins and server errors never use up the quota the staff share behind one
 * public IP. Ten wrong passwords from that IP still block everyone on it.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (req, res) => res.statusCode !== 401,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos. Inténtalo de nuevo en 15 minutos.' },
  },
});

import { rateLimit } from 'express-rate-limit'
import { AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS } from '../config/constants.js'

export const registerRateLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  limit: AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      data: null,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Try again later.',
      },
    })
  },
})

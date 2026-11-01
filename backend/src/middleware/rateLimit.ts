import { rateLimit } from 'express-rate-limit'
import {
  AUTH_RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_WINDOW_MS,
} from '../config/constants.js'
import { env } from '../config/env.js'

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

export const uploadRateLimiter = rateLimit({
  windowMs: env.UPLOAD_RATE_LIMIT_WINDOW_MS,
  limit: env.UPLOAD_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      data: null,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many uploads. Try again later.',
      },
    })
  },
})

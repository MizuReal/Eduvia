import { Router } from 'express'
import { register } from '../controllers/authController.js'
import { registerRateLimiter } from '../middleware/rateLimit.js'

export const authRouter = Router()

authRouter.post('/register', registerRateLimiter, register)

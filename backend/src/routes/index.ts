import { Router } from 'express'
import { register } from '../controllers/authController.js'
import { getCurrentUser } from '../controllers/usersController.js'
import { requireAuth } from '../middleware/auth.js'
import { registerRateLimiter } from '../middleware/rateLimit.js'

export const apiRouter = Router()

apiRouter.post('/auth/register', registerRateLimiter, register)
apiRouter.get('/users/me', requireAuth, getCurrentUser)

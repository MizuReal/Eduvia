import { Router } from 'express'
import { register } from '../controllers/authController.js'
import {
  createCourseHandler,
  listCoursesHandler,
} from '../controllers/coursesController.js'
import { getCurrentUser } from '../controllers/usersController.js'
import { requireAuth } from '../middleware/auth.js'
import { registerRateLimiter } from '../middleware/rateLimit.js'
import { requireRole } from '../middleware/roles.js'

export const apiRouter = Router()

apiRouter.post('/auth/register', registerRateLimiter, register)
apiRouter.get('/users/me', requireAuth, getCurrentUser)
apiRouter.get(
  '/courses',
  requireAuth,
  requireRole('instructor'),
  listCoursesHandler,
)
apiRouter.post(
  '/courses',
  requireAuth,
  requireRole('instructor'),
  createCourseHandler,
)

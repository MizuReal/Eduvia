import { Router } from 'express'
import { getCurrentUser } from '../controllers/usersController.js'
import { requireAuth } from '../middleware/auth.js'

export const usersRouter = Router()

usersRouter.get('/me', requireAuth, getCurrentUser)

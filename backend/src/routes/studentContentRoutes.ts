import { Router } from 'express'
import { getStudentTopicContentHandler } from '../controllers/studentContentController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/roles.js'

export const studentContentRouter = Router()

studentContentRouter.use(requireAuth)

studentContentRouter.get(
  '/student/topics/:topicId/content',
  requireRole('student'),
  getStudentTopicContentHandler,
)

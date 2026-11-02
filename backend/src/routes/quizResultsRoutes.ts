import { Router } from 'express'
import {
  getStudentQuizResultsHandler,
  getTopicQuizResultsHandler,
} from '../controllers/quizResultsController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/roles.js'

export const quizResultsRouter = Router()

quizResultsRouter.use(requireAuth, requireRole('instructor'))

quizResultsRouter.get(
  '/topics/:topicId/quiz/results',
  getTopicQuizResultsHandler,
)
quizResultsRouter.get(
  '/courses/:courseId/students/:studentId/quiz-results',
  getStudentQuizResultsHandler,
)

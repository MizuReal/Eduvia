import { Router } from 'express'
import {
  getStudentAttemptHandler,
  getStudentTopicContentHandler,
  recordSlideProgressHandler,
  saveStudentAttemptAnswersHandler,
  startQuizAttemptHandler,
  submitStudentAttemptHandler,
} from '../controllers/studentContentController.js'
import { getOwnStudentQuizResultsHandler } from '../controllers/quizResultsController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/roles.js'

export const studentContentRouter = Router()

studentContentRouter.use(requireAuth)

studentContentRouter.get(
  '/student/topics/:topicId/content',
  requireRole('student'),
  getStudentTopicContentHandler,
)
studentContentRouter.get(
  '/student/subjects/:courseId/quiz-results',
  requireRole('student'),
  getOwnStudentQuizResultsHandler,
)
studentContentRouter.patch(
  '/student/topics/:topicId/progress',
  requireRole('student'),
  recordSlideProgressHandler,
)

studentContentRouter.post(
  '/quizzes/:quizId/attempts',
  requireRole('student'),
  startQuizAttemptHandler,
)
studentContentRouter.get(
  '/attempts/:attemptId',
  requireRole('student'),
  getStudentAttemptHandler,
)
studentContentRouter.patch(
  '/attempts/:attemptId/answers',
  requireRole('student'),
  saveStudentAttemptAnswersHandler,
)
studentContentRouter.post(
  '/attempts/:attemptId/submit',
  requireRole('student'),
  submitStudentAttemptHandler,
)

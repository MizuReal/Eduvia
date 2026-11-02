import { Router } from 'express'
import {
  deleteQuizHandler,
  ensureQuizHandler,
  getQuizHandler,
  getQuizWorkspaceHandler,
  previewGradeHandler,
  publishQuizHandler,
  removeQuizPaperHandler,
  saveQuizHandler,
  uploadQuizPaperHandler,
} from '../controllers/quizController.js'
import { requireAuth } from '../middleware/auth.js'
import { uploadRateLimiter } from '../middleware/rateLimit.js'
import { requireRole } from '../middleware/roles.js'
import { acceptSingleFile } from '../middleware/upload.js'

export const quizRouter = Router()

quizRouter.use(requireAuth, requireRole('instructor'))

quizRouter.get('/topics/:topicId/quiz', getQuizWorkspaceHandler)
quizRouter.put('/topics/:topicId/quiz', ensureQuizHandler)

quizRouter.get('/quizzes/:quizId', getQuizHandler)
quizRouter.put('/quizzes/:quizId', saveQuizHandler)
quizRouter.delete('/quizzes/:quizId', deleteQuizHandler)
quizRouter.post('/quizzes/:quizId/publish', publishQuizHandler)
quizRouter.post('/quizzes/:quizId/preview-grade', previewGradeHandler)
quizRouter.post(
  '/quizzes/:quizId/paper',
  uploadRateLimiter,
  acceptSingleFile,
  uploadQuizPaperHandler,
)
quizRouter.delete('/quizzes/:quizId/paper', removeQuizPaperHandler)

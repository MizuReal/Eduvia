import { Router } from 'express'
import {
  deleteLessonHandler,
  deleteTopicHandler,
  reorderLessonsHandler,
  restoreLessonHandler,
  restoreTopicHandler,
  updateLessonHandler,
  updateTopicHandler,
} from '../controllers/courseOutlineController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/roles.js'

export const outlineRouter = Router()

outlineRouter.use(requireAuth, requireRole('instructor'))

outlineRouter.patch('/topics/:topicId', updateTopicHandler)
outlineRouter.delete('/topics/:topicId', deleteTopicHandler)
outlineRouter.patch('/topics/:topicId/lessons/reorder', reorderLessonsHandler)
outlineRouter.post('/topics/:topicId/restore', restoreTopicHandler)

outlineRouter.patch('/lessons/:lessonId', updateLessonHandler)
outlineRouter.delete('/lessons/:lessonId', deleteLessonHandler)
outlineRouter.post('/lessons/:lessonId/restore', restoreLessonHandler)

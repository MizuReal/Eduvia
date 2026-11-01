import { Router } from 'express'
import {
  createLessonHandler,
  createTopicHandler,
  getCourseOutlineHandler,
} from '../controllers/courseOutlineController.js'
import {
  createCourseHandler,
  listCoursesHandler,
} from '../controllers/coursesController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/roles.js'

export const courseRouter = Router()

courseRouter.use(requireAuth, requireRole('instructor'))

courseRouter.get('/', listCoursesHandler)
courseRouter.post('/', createCourseHandler)
courseRouter.get('/:courseId', getCourseOutlineHandler)
courseRouter.post('/:courseId/topics', createTopicHandler)
courseRouter.post('/:courseId/lessons', createLessonHandler)

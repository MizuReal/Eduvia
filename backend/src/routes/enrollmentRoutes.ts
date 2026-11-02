import { Router } from 'express'
import {
  approveEnrollmentHandler,
  createEnrollmentHandler,
  getCourseEnrollmentsHandler,
  getEnrollmentJoinPreviewHandler,
  getStudentDashboardHandler,
  getStudentSubjectHandler,
  rejectEnrollmentHandler,
  removeEnrollmentHandler,
  updateEnrollmentSettingsHandler,
} from '../controllers/enrollmentController.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/roles.js'

export const enrollmentRouter = Router()

enrollmentRouter.use(requireAuth)

enrollmentRouter.get(
  '/enrollments/me',
  requireRole('student'),
  getStudentDashboardHandler,
)
enrollmentRouter.get(
  '/enrollments/join/:courseId',
  requireRole('student'),
  getEnrollmentJoinPreviewHandler,
)
enrollmentRouter.post(
  '/enrollments',
  requireRole('student'),
  createEnrollmentHandler,
)
enrollmentRouter.get(
  '/student/subjects/:courseId',
  requireRole('student'),
  getStudentSubjectHandler,
)

enrollmentRouter.get(
  '/courses/:courseId/enrollments',
  requireRole('instructor'),
  getCourseEnrollmentsHandler,
)
enrollmentRouter.patch(
  '/courses/:courseId/enrollment-settings',
  requireRole('instructor'),
  updateEnrollmentSettingsHandler,
)
enrollmentRouter.post(
  '/enrollments/:enrollmentId/approve',
  requireRole('instructor'),
  approveEnrollmentHandler,
)
enrollmentRouter.post(
  '/enrollments/:enrollmentId/reject',
  requireRole('instructor'),
  rejectEnrollmentHandler,
)
enrollmentRouter.delete(
  '/enrollments/:enrollmentId',
  requireRole('instructor'),
  removeEnrollmentHandler,
)

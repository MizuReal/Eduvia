import type { Request, Response } from 'express'
import type { ZodError } from 'zod'
import { AppError } from '../errors/AppError.js'
import {
  courseIdEnrollmentParamSchema,
  createEnrollmentSchema,
  enrollmentIdParamSchema,
  updateEnrollmentSettingsSchema,
} from '../schemas/enrollment.js'
import {
  approveEnrollment as approveEnrollmentService,
  getCourseEnrollments as getCourseEnrollmentsService,
  getEnrollmentJoinPreview as getEnrollmentJoinPreviewService,
  getStudentDashboard as getStudentDashboardService,
  getStudentSubject as getStudentSubjectService,
  rejectEnrollment as rejectEnrollmentService,
  removeEnrollment as removeEnrollmentService,
  requestEnrollment as requestEnrollmentService,
  updateEnrollmentSettings as updateEnrollmentSettingsService,
} from '../services/enrollmentService.js'
import { requireAuthenticatedUser } from '../utils/authUser.js'
import { formatZodError } from '../utils/validation.js'

function validationError(error: ZodError): AppError {
  return new AppError(
    400,
    'VALIDATION_ERROR',
    'Please check the highlighted fields.',
    formatZodError(error),
  )
}

export async function getStudentDashboardHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const dashboard = await getStudentDashboardService(user)

  res.status(200).json({ data: dashboard, error: null })
}

export async function getEnrollmentJoinPreviewHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = courseIdEnrollmentParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const preview = await getEnrollmentJoinPreviewService(
    user,
    params.data.courseId,
  )

  res.status(200).json({ data: preview, error: null })
}

export async function createEnrollmentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const body = createEnrollmentSchema.safeParse(req.body)

  if (!body.success) {
    throw validationError(body.error)
  }

  const preview = await requestEnrollmentService(user, body.data.courseId)

  res.status(200).json({ data: preview, error: null })
}

export async function getStudentSubjectHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = courseIdEnrollmentParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const subject = await getStudentSubjectService(user, params.data.courseId)

  res.status(200).json({ data: subject, error: null })
}

export async function getCourseEnrollmentsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = courseIdEnrollmentParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const workspace = await getCourseEnrollmentsService(
    user,
    params.data.courseId,
  )

  res.status(200).json({ data: workspace, error: null })
}

export async function updateEnrollmentSettingsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = courseIdEnrollmentParamSchema.safeParse(req.params)
  const body = updateEnrollmentSettingsSchema.safeParse(req.body)

  if (!params.success) {
    throw validationError(params.error)
  }

  if (!body.success) {
    throw validationError(body.error)
  }

  const workspace = await updateEnrollmentSettingsService(
    user,
    params.data.courseId,
    body.data,
  )

  res.status(200).json({ data: workspace, error: null })
}

export async function approveEnrollmentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = enrollmentIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const workspace = await approveEnrollmentService(
    user,
    params.data.enrollmentId,
  )

  res.status(200).json({ data: workspace, error: null })
}

export async function rejectEnrollmentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = enrollmentIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const workspace = await rejectEnrollmentService(
    user,
    params.data.enrollmentId,
  )

  res.status(200).json({ data: workspace, error: null })
}

export async function removeEnrollmentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = enrollmentIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const workspace = await removeEnrollmentService(
    user,
    params.data.enrollmentId,
  )

  res.status(200).json({ data: workspace, error: null })
}

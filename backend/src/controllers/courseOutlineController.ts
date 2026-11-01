import type { Request, Response } from 'express'
import type { ZodError } from 'zod'
import { AppError } from '../errors/AppError.js'
import {
  courseIdParamSchema,
  createLessonSchema,
  createTopicSchema,
} from '../schemas/courseOutline.js'
import {
  createLesson as createLessonService,
  createTopic as createTopicService,
  getCourseOutline as getCourseOutlineService,
} from '../services/courseOutlineService.js'
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

export async function getCourseOutlineHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = courseIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const outline = await getCourseOutlineService(user, params.data.courseId)

  res.status(200).json({ data: outline, error: null })
}

export async function createTopicHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = courseIdParamSchema.safeParse(req.params)
  const body = createTopicSchema.safeParse(req.body)

  if (!params.success) {
    throw validationError(params.error)
  }

  if (!body.success) {
    throw validationError(body.error)
  }

  const topic = await createTopicService(user, params.data.courseId, body.data)

  res.status(201).json({ data: topic, error: null })
}

export async function createLessonHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = courseIdParamSchema.safeParse(req.params)
  const body = createLessonSchema.safeParse(req.body)

  if (!params.success) {
    throw validationError(params.error)
  }

  if (!body.success) {
    throw validationError(body.error)
  }

  const lesson = await createLessonService(
    user,
    params.data.courseId,
    body.data,
  )

  res.status(201).json({ data: lesson, error: null })
}

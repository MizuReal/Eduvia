import type { Request, Response } from 'express'
import type { ZodError } from 'zod'
import { AppError } from '../errors/AppError.js'
import { topicIdParamSchema } from '../schemas/courseOutline.js'
import {
  attemptIdParamSchema,
  recordSlideProgressSchema,
  saveAttemptAnswersSchema,
} from '../schemas/learning.js'
import { quizIdParamSchema } from '../schemas/quiz.js'
import {
  getStudentAttempt as getStudentAttemptService,
  getStudentTopicContent as getStudentTopicContentService,
  recordSlideProgress as recordSlideProgressService,
  saveStudentAttemptAnswers as saveStudentAttemptAnswersService,
  startQuizAttempt as startQuizAttemptService,
  submitStudentAttempt as submitStudentAttemptService,
} from '../services/studentLearningService.js'
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

export async function getStudentTopicContentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = topicIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const content = await getStudentTopicContentService(
    user,
    params.data.topicId,
  )

  res.status(200).json({ data: content, error: null })
}

export async function recordSlideProgressHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = topicIdParamSchema.safeParse(req.params)
  const body = recordSlideProgressSchema.safeParse(req.body)

  if (!params.success) {
    throw validationError(params.error)
  }

  if (!body.success) {
    throw validationError(body.error)
  }

  const progress = await recordSlideProgressService(
    user,
    params.data.topicId,
    body.data.source,
    body.data.slideIndex,
  )

  res.status(200).json({ data: progress, error: null })
}

export async function startQuizAttemptHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = quizIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const attempt = await startQuizAttemptService(user, params.data.quizId)

  res.status(200).json({ data: attempt, error: null })
}

export async function getStudentAttemptHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = attemptIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const attempt = await getStudentAttemptService(
    user,
    params.data.attemptId,
  )

  res.status(200).json({ data: attempt, error: null })
}

export async function saveStudentAttemptAnswersHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = attemptIdParamSchema.safeParse(req.params)
  const body = saveAttemptAnswersSchema.safeParse(req.body)

  if (!params.success) {
    throw validationError(params.error)
  }

  if (!body.success) {
    throw validationError(body.error)
  }

  const attempt = await saveStudentAttemptAnswersService(
    user,
    params.data.attemptId,
    body.data,
  )

  res.status(200).json({ data: attempt, error: null })
}

export async function submitStudentAttemptHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = attemptIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const attempt = await submitStudentAttemptService(
    user,
    params.data.attemptId,
  )

  res.status(200).json({ data: attempt, error: null })
}

import type { Request, Response } from 'express'
import type { ZodError } from 'zod'
import { AppError } from '../errors/AppError.js'
import { topicIdParamSchema } from '../schemas/courseOutline.js'
import { studentQuizResultsParamSchema } from '../schemas/quizResults.js'
import {
  getStudentQuizResults as getStudentQuizResultsService,
  getTopicQuizResults as getTopicQuizResultsService,
} from '../services/quizResultsService.js'
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

export async function getTopicQuizResultsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = topicIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const results = await getTopicQuizResultsService(user, params.data.topicId)
  res.status(200).json({ data: results, error: null })
}

export async function getStudentQuizResultsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = studentQuizResultsParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const results = await getStudentQuizResultsService(
    user,
    params.data.courseId,
    params.data.studentId,
  )
  res.status(200).json({ data: results, error: null })
}

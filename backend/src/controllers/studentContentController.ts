import type { Request, Response } from 'express'
import { AppError } from '../errors/AppError.js'
import { topicIdParamSchema } from '../schemas/courseOutline.js'
import { getStudentTopicContent as getStudentTopicContentService } from '../services/topicContentService.js'
import { requireAuthenticatedUser } from '../utils/authUser.js'
import { formatZodError } from '../utils/validation.js'

export async function getStudentTopicContentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = topicIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Please check the highlighted fields.',
      formatZodError(params.error),
    )
  }

  const content = await getStudentTopicContentService(
    user,
    params.data.topicId,
  )

  res.status(200).json({ data: content, error: null })
}

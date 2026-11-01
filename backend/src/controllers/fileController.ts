import type { Request, Response } from 'express'
import { AppError } from '../errors/AppError.js'
import { fileIdParamSchema } from '../schemas/topicContent.js'
import { getFileSignedUrl } from '../services/fileService.js'
import { requireAuthenticatedUser } from '../utils/authUser.js'
import { formatZodError } from '../utils/validation.js'

export async function getFileUrlHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = fileIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Please check the highlighted fields.',
      formatZodError(params.error),
    )
  }

  const file = await getFileSignedUrl(user, params.data.fileId)

  res.status(200).json({ data: file, error: null })
}

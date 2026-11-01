import type { Request, Response } from 'express'
import type { ZodError } from 'zod'
import { AppError } from '../errors/AppError.js'
import {
  contentIdParamSchema,
  contentKindParamSchema,
  assetUploadSchema,
  presentationUploadSchema,
  updateContentSchema,
} from '../schemas/topicContent.js'
import { topicIdParamSchema } from '../schemas/courseOutline.js'
import {
  deleteContent as deleteContentService,
  ensureContent as ensureContentService,
  getContent as getContentService,
  getTopicWorkspace as getTopicWorkspaceService,
  updateContent as updateContentService,
  uploadContentAsset as uploadContentAssetService,
  uploadPresentation as uploadPresentationService,
} from '../services/topicContentService.js'
import { requireAuthenticatedUser } from '../utils/authUser.js'
import { formatZodError } from '../utils/validation.js'
import { removeTempUpload } from '../utils/files.js'

function validationError(error: ZodError): AppError {
  return new AppError(
    400,
    'VALIDATION_ERROR',
    'Please check the highlighted fields.',
    formatZodError(error),
  )
}

function requireUploadedFile(req: Request): Express.Multer.File {
  if (!req.file) {
    throw new AppError(400, 'FILE_REQUIRED', 'Choose a file to upload.')
  }

  return req.file
}

export async function getTopicWorkspaceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = topicIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const content = await getTopicWorkspaceService(user, params.data.topicId)

  res.status(200).json({ data: content, error: null })
}

export async function ensureContentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = topicIdParamSchema
    .and(contentKindParamSchema)
    .safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const content = await ensureContentService(
    user,
    params.data.topicId,
    params.data.kind,
  )

  res.status(200).json({ data: content, error: null })
}

export async function getContentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = contentIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const content = await getContentService(user, params.data.contentId)

  res.status(200).json({ data: content, error: null })
}

export async function updateContentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = contentIdParamSchema.safeParse(req.params)
  const body = updateContentSchema.safeParse(req.body)

  if (!params.success) {
    throw validationError(params.error)
  }

  if (!body.success) {
    throw validationError(body.error)
  }

  const content = await updateContentService(
    user,
    params.data.contentId,
    body.data,
  )

  res.status(200).json({ data: content, error: null })
}

export async function deleteContentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = contentIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  await deleteContentService(user, params.data.contentId)

  res.status(200).json({ data: { id: params.data.contentId }, error: null })
}

export async function uploadPresentationHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const file = requireUploadedFile(req)

  try {
    const params = topicIdParamSchema.safeParse(req.params)
    const body = presentationUploadSchema.safeParse(req.body)

    if (!params.success) {
      throw validationError(params.error)
    }

    if (!body.success) {
      throw validationError(body.error)
    }

    const content = await uploadPresentationService(
      user,
      params.data.topicId,
      file,
      body.data,
    )

    res.status(201).json({ data: content, error: null })
  } catch (error) {
    await removeTempUpload(file.path)
    throw error
  }
}

export async function uploadContentAssetHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const file = requireUploadedFile(req)

  try {
    const params = contentIdParamSchema.safeParse(req.params)
    const body = assetUploadSchema.safeParse(req.body)

    if (!params.success) {
      throw validationError(params.error)
    }

    if (!body.success) {
      throw validationError(body.error)
    }

    const asset = await uploadContentAssetService(
      user,
      params.data.contentId,
      file,
      body.data.kind,
    )

    res.status(201).json({ data: asset, error: null })
  } catch (error) {
    await removeTempUpload(file.path)
    throw error
  }
}

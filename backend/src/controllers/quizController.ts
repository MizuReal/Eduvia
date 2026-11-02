import type { Request, Response } from 'express'
import type { ZodError } from 'zod'
import { AppError } from '../errors/AppError.js'
import {
  createQuizSchema,
  previewGradeSchema,
  quizIdParamSchema,
  saveQuizSchema,
} from '../schemas/quiz.js'
import { topicIdParamSchema } from '../schemas/courseOutline.js'
import {
  deleteQuiz as deleteQuizService,
  ensureQuiz as ensureQuizService,
  getQuiz as getQuizService,
  getQuizWorkspace as getQuizWorkspaceService,
  previewGradeQuiz as previewGradeQuizService,
  publishQuiz as publishQuizService,
  removeQuizPaper as removeQuizPaperService,
  saveQuiz as saveQuizService,
  uploadQuizPaper as uploadQuizPaperService,
} from '../services/quizService.js'
import { requireAuthenticatedUser } from '../utils/authUser.js'
import { removeTempUpload } from '../utils/files.js'
import { formatZodError } from '../utils/validation.js'

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
    throw new AppError(400, 'FILE_REQUIRED', 'Choose a quiz paper to upload.')
  }

  return req.file
}

export async function getQuizWorkspaceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = topicIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const workspace = await getQuizWorkspaceService(user, params.data.topicId)
  res.status(200).json({ data: workspace, error: null })
}

export async function ensureQuizHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = topicIdParamSchema.safeParse(req.params)
  const body = createQuizSchema.safeParse(req.body)

  if (!params.success) {
    throw validationError(params.error)
  }

  if (!body.success) {
    throw validationError(body.error)
  }

  const quiz = await ensureQuizService(
    user,
    params.data.topicId,
    body.data,
  )
  res.status(200).json({ data: quiz, error: null })
}

export async function getQuizHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = quizIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const quiz = await getQuizService(user, params.data.quizId)
  res.status(200).json({ data: quiz, error: null })
}

export async function saveQuizHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = quizIdParamSchema.safeParse(req.params)
  const body = saveQuizSchema.safeParse(req.body)

  if (!params.success) {
    throw validationError(params.error)
  }

  if (!body.success) {
    throw validationError(body.error)
  }

  const quiz = await saveQuizService(
    user,
    params.data.quizId,
    body.data,
  )
  res.status(200).json({ data: quiz, error: null })
}

export async function publishQuizHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = quizIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const quiz = await publishQuizService(user, params.data.quizId)
  res.status(200).json({ data: quiz, error: null })
}

export async function uploadQuizPaperHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const file = requireUploadedFile(req)

  try {
    const params = quizIdParamSchema.safeParse(req.params)

    if (!params.success) {
      throw validationError(params.error)
    }

    const quiz = await uploadQuizPaperService(
      user,
      params.data.quizId,
      file,
    )
    res.status(200).json({ data: quiz, error: null })
  } catch (error) {
    await removeTempUpload(file.path)
    throw error
  }
}

export async function removeQuizPaperHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = quizIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const quiz = await removeQuizPaperService(user, params.data.quizId)
  res.status(200).json({ data: quiz, error: null })
}

export async function deleteQuizHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = quizIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  await deleteQuizService(user, params.data.quizId)
  res.status(200).json({ data: { id: params.data.quizId }, error: null })
}

export async function previewGradeHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = quizIdParamSchema.safeParse(req.params)
  const body = previewGradeSchema.safeParse(req.body)

  if (!params.success) {
    throw validationError(params.error)
  }

  if (!body.success) {
    throw validationError(body.error)
  }

  const result = await previewGradeQuizService(
    user,
    params.data.quizId,
    body.data,
  )
  res.status(200).json({ data: result, error: null })
}

import type { Request, Response } from 'express'
import type { ZodError } from 'zod'
import { AppError } from '../errors/AppError.js'
import {
  courseIdParamSchema,
  createLessonSchema,
  createTopicSchema,
  lessonIdParamSchema,
  reorderLessonsSchema,
  reorderTopicsSchema,
  topicIdParamSchema,
  updateLessonSchema,
  updateTopicSchema,
} from '../schemas/courseOutline.js'
import {
  createLesson as createLessonService,
  createTopic as createTopicService,
  deleteLesson as deleteLessonService,
  deleteTopic as deleteTopicService,
  getCourseOutline as getCourseOutlineService,
  getTrash as getTrashService,
  reorderLessons as reorderLessonsService,
  reorderTopics as reorderTopicsService,
  restoreLesson as restoreLessonService,
  restoreTopic as restoreTopicService,
  updateLesson as updateLessonService,
  updateTopic as updateTopicService,
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

export async function updateTopicHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = topicIdParamSchema.safeParse(req.params)
  const body = updateTopicSchema.safeParse(req.body)

  if (!params.success) {
    throw validationError(params.error)
  }

  if (!body.success) {
    throw validationError(body.error)
  }

  const topic = await updateTopicService(user, params.data.topicId, body.data)

  res.status(200).json({ data: topic, error: null })
}

export async function deleteTopicHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = topicIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  await deleteTopicService(user, params.data.topicId)

  res.status(200).json({ data: { id: params.data.topicId }, error: null })
}

export async function updateLessonHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = lessonIdParamSchema.safeParse(req.params)
  const body = updateLessonSchema.safeParse(req.body)

  if (!params.success) {
    throw validationError(params.error)
  }

  if (!body.success) {
    throw validationError(body.error)
  }

  const lesson = await updateLessonService(
    user,
    params.data.lessonId,
    body.data,
  )

  res.status(200).json({ data: lesson, error: null })
}

export async function deleteLessonHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = lessonIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  await deleteLessonService(user, params.data.lessonId)

  res.status(200).json({ data: { id: params.data.lessonId }, error: null })
}

export async function reorderTopicsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = courseIdParamSchema.safeParse(req.params)
  const body = reorderTopicsSchema.safeParse(req.body)

  if (!params.success) {
    throw validationError(params.error)
  }

  if (!body.success) {
    throw validationError(body.error)
  }

  await reorderTopicsService(user, params.data.courseId, body.data)

  res.status(200).json({ data: { topicIds: body.data.topicIds }, error: null })
}

export async function reorderLessonsHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = topicIdParamSchema.safeParse(req.params)
  const body = reorderLessonsSchema.safeParse(req.body)

  if (!params.success) {
    throw validationError(params.error)
  }

  if (!body.success) {
    throw validationError(body.error)
  }

  await reorderLessonsService(user, params.data.topicId, body.data)

  res
    .status(200)
    .json({ data: { lessonIds: body.data.lessonIds }, error: null })
}

export async function getTrashHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = courseIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const trash = await getTrashService(user, params.data.courseId)

  res.status(200).json({ data: trash, error: null })
}

export async function restoreTopicHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = topicIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const topic = await restoreTopicService(user, params.data.topicId)

  res.status(200).json({ data: topic, error: null })
}

export async function restoreLessonHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireAuthenticatedUser(req)
  const params = lessonIdParamSchema.safeParse(req.params)

  if (!params.success) {
    throw validationError(params.error)
  }

  const lesson = await restoreLessonService(user, params.data.lessonId)

  res.status(200).json({ data: lesson, error: null })
}

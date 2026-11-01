import type { Request, Response } from 'express'
import { AppError } from '../errors/AppError.js'
import { createCourseSchema } from '../schemas/course.js'
import {
  createCourse as createCourseService,
  listCourses as listCoursesService,
} from '../services/courseService.js'
import type { AuthenticatedUser } from '../types/auth.js'
import { formatZodError } from '../utils/validation.js'

function requireUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required.')
  }

  return req.user
}

export async function createCourseHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireUser(req)
  const parsed = createCourseSchema.safeParse(req.body)

  if (!parsed.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Please check the highlighted fields.',
      formatZodError(parsed.error),
    )
  }

  const course = await createCourseService(user, parsed.data)

  res.status(201).json({ data: course, error: null })
}

export async function listCoursesHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const user = requireUser(req)
  const courses = await listCoursesService(user)

  res.status(200).json({ data: courses, error: null })
}

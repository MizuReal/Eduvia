import { MAX_GENERATED_CODE_ATTEMPTS } from '../config/constants.js'
import {
  insertCourse,
  listCourseCodesForScope,
  listCoursesByInstructor,
} from '../db/courses.js'
import { AppError } from '../errors/AppError.js'
import type { CreateCourseInput } from '../schemas/course.js'
import type { AuthenticatedUser } from '../types/auth.js'
import type { Course } from '../types/course.js'
import {
  nextAvailableCourseCode,
  suggestCourseCode,
} from '../utils/courseCode.js'

export async function createCourse(
  user: AuthenticatedUser,
  input: CreateCourseInput,
): Promise<Course> {
  if (input.code) {
    return insertCourse({ ...input, code: input.code }, user.id)
  }

  const baseCode = suggestCourseCode(input.name)
  const usedCodes = new Set(
    await listCourseCodesForScope(user.id, input.term, input.yearLevel),
  )

  for (let attempt = 0; attempt < MAX_GENERATED_CODE_ATTEMPTS; attempt += 1) {
    const code = nextAvailableCourseCode(baseCode, usedCodes)

    try {
      return await insertCourse({ ...input, code }, user.id)
    } catch (error) {
      if (error instanceof AppError && error.code === 'COURSE_CODE_TAKEN') {
        usedCodes.add(code)
        continue
      }

      throw error
    }
  }

  throw new AppError(
    409,
    'COURSE_CODE_TAKEN',
    'We could not generate a unique subject code. Try a custom code.',
  )
}

export async function listCourses(user: AuthenticatedUser): Promise<Course[]> {
  return listCoursesByInstructor(user.id)
}

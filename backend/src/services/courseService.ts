import { insertCourse, listCoursesByInstructor } from '../db/courses.js'
import type { CreateCourseInput } from '../schemas/course.js'
import type { AuthenticatedUser } from '../types/auth.js'
import type { Course } from '../types/course.js'

export async function createCourse(
  user: AuthenticatedUser,
  input: CreateCourseInput,
): Promise<Course> {
  return insertCourse(input, user.id)
}

export async function listCourses(user: AuthenticatedUser): Promise<Course[]> {
  return listCoursesByInstructor(user.id)
}

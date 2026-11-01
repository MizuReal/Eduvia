import { findCourseForInstructor } from '../db/courses.js'
import {
  findTopicForCourse,
  getNextLessonOrderIndex,
  getNextTopicOrderIndex,
  insertLesson,
  insertTopic,
  listTopicsAndLessons,
} from '../db/courseOutline.js'
import { AppError } from '../errors/AppError.js'
import type {
  CreateLessonInput,
  CreateTopicInput,
} from '../schemas/courseOutline.js'
import type { AuthenticatedUser } from '../types/auth.js'
import type {
  CourseOutline,
  CourseTopic,
  Lesson,
} from '../types/courseOutline.js'

async function requireOwnedCourse(
  user: AuthenticatedUser,
  courseId: string,
): Promise<void> {
  const course = await findCourseForInstructor(courseId, user.id)

  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Subject not found.')
  }
}

export async function getCourseOutline(
  user: AuthenticatedUser,
  courseId: string,
): Promise<CourseOutline> {
  const course = await findCourseForInstructor(courseId, user.id)

  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Subject not found.')
  }

  const topics = await listTopicsAndLessons(courseId)

  return { ...course, topics }
}

export async function createTopic(
  user: AuthenticatedUser,
  courseId: string,
  input: CreateTopicInput,
): Promise<CourseTopic> {
  await requireOwnedCourse(user, courseId)

  const orderIndex = await getNextTopicOrderIndex(courseId)

  return insertTopic(courseId, input.title, orderIndex)
}

export async function createLesson(
  user: AuthenticatedUser,
  courseId: string,
  input: CreateLessonInput,
): Promise<Lesson> {
  await requireOwnedCourse(user, courseId)

  const topic = await findTopicForCourse(courseId, input.topicId)

  if (!topic) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  const orderIndex = await getNextLessonOrderIndex(input.topicId)

  return insertLesson(courseId, input.topicId, input.title, orderIndex)
}

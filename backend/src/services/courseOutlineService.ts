import { findCourseForInstructor } from '../db/courses.js'
import {
  findDeletedLessonForInstructor,
  findDeletedTopicForInstructor,
  findLessonForInstructor,
  findTopicForCourse,
  findTopicForInstructor,
  getCourseTrash as getCourseTrashRecord,
  getNextLessonOrderIndex,
  getNextTopicOrderIndex,
  insertLesson,
  insertTopic,
  listTopicsAndLessons,
  reorderCourseTopics,
  reorderTopicLessons,
  restoreLesson as restoreLessonRecord,
  restoreTopic as restoreTopicRecord,
  softDeleteLesson,
  softDeleteTopic,
  updateLessonRecord,
  updateTopicTitle,
} from '../db/courseOutline.js'
import { AppError } from '../errors/AppError.js'
import type {
  CreateLessonInput,
  CreateTopicInput,
  ReorderLessonsInput,
  ReorderTopicsInput,
  UpdateLessonInput,
  UpdateTopicInput,
} from '../schemas/courseOutline.js'
import type { AuthenticatedUser } from '../types/auth.js'
import type {
  CourseOutline,
  CourseTopic,
  CourseTopicSummary,
  CourseTrash,
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

function assertExactIds(
  expected: readonly string[],
  provided: readonly string[],
): void {
  const expectedSet = new Set(expected)
  const providedSet = new Set(provided)

  if (
    provided.length !== expected.length ||
    providedSet.size !== provided.length ||
    expectedSet.size !== providedSet.size
  ) {
    throw new AppError(
      400,
      'INVALID_ORDER',
      'The order must include every active item exactly once.',
    )
  }

  for (const id of provided) {
    if (!expectedSet.has(id)) {
      throw new AppError(
        400,
        'INVALID_ORDER',
        'The order must include every active item exactly once.',
      )
    }
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

export async function updateTopic(
  user: AuthenticatedUser,
  topicId: string,
  input: UpdateTopicInput,
): Promise<CourseTopicSummary> {
  const topic = await findTopicForInstructor(topicId, user.id)

  if (!topic) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  return updateTopicTitle(topicId, input.title)
}

export async function deleteTopic(
  user: AuthenticatedUser,
  topicId: string,
): Promise<void> {
  const topic = await findTopicForInstructor(topicId, user.id)

  if (!topic) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  await softDeleteTopic(topicId)
}

export async function updateLesson(
  user: AuthenticatedUser,
  lessonId: string,
  input: UpdateLessonInput,
): Promise<Lesson> {
  const lesson = await findLessonForInstructor(lessonId, user.id)

  if (!lesson) {
    throw new AppError(404, 'LESSON_NOT_FOUND', 'Lesson not found.')
  }

  if (input.topicId) {
    const targetTopic = await findTopicForCourse(
      lesson.course_id,
      input.topicId,
    )

    if (!targetTopic) {
      throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
    }
  }

  return updateLessonRecord(lessonId, input)
}

export async function deleteLesson(
  user: AuthenticatedUser,
  lessonId: string,
): Promise<void> {
  const lesson = await findLessonForInstructor(lessonId, user.id)

  if (!lesson) {
    throw new AppError(404, 'LESSON_NOT_FOUND', 'Lesson not found.')
  }

  await softDeleteLesson(lessonId)
}

export async function reorderTopics(
  user: AuthenticatedUser,
  courseId: string,
  input: ReorderTopicsInput,
): Promise<void> {
  const outline = await getCourseOutline(user, courseId)

  assertExactIds(
    outline.topics.map((topic) => topic.id),
    input.topicIds,
  )

  await reorderCourseTopics(courseId, input.topicIds)
}

export async function reorderLessons(
  user: AuthenticatedUser,
  topicId: string,
  input: ReorderLessonsInput,
): Promise<void> {
  const topic = await findTopicForInstructor(topicId, user.id)

  if (!topic) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  const topics = await listTopicsAndLessons(topic.course_id)
  const topicOutline = topics.find((item) => item.id === topicId)

  if (!topicOutline) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  assertExactIds(
    topicOutline.lessons.map((lesson) => lesson.id),
    input.lessonIds,
  )

  await reorderTopicLessons(topicId, input.lessonIds)
}

export async function getTrash(
  user: AuthenticatedUser,
  courseId: string,
): Promise<CourseTrash> {
  await requireOwnedCourse(user, courseId)

  return getCourseTrashRecord(courseId)
}

export async function restoreTopic(
  user: AuthenticatedUser,
  topicId: string,
): Promise<CourseTopic> {
  const topic = await findDeletedTopicForInstructor(topicId, user.id)

  if (!topic) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  return restoreTopicRecord(topicId)
}

export async function restoreLesson(
  user: AuthenticatedUser,
  lessonId: string,
): Promise<Lesson> {
  const lesson = await findDeletedLessonForInstructor(lessonId, user.id)

  if (!lesson) {
    throw new AppError(404, 'LESSON_NOT_FOUND', 'Lesson not found.')
  }

  const parentTopic = await findTopicForCourse(
    lesson.course_id,
    lesson.topic_id,
  )

  if (!parentTopic) {
    throw new AppError(
      409,
      'TOPIC_DELETED',
      'Restore the parent topic before restoring this lesson.',
    )
  }

  return restoreLessonRecord(lessonId)
}

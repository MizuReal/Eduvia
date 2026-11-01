import type {
  CourseOutline,
  CourseTopic,
  CourseTopicSummary,
  CourseTrash,
  CreateLessonInput,
  CreateTopicInput,
  Lesson,
  UpdateLessonInput,
  UpdateTopicInput,
} from '../types/courseOutline'
import { deleteAuth, get, patchAuth, postAuth } from './apiClient'

export function getCourseOutline(
  courseId: string,
  accessToken: string,
): Promise<CourseOutline> {
  return get<CourseOutline>(`/api/courses/${courseId}`, accessToken)
}

export function createTopic(
  courseId: string,
  input: CreateTopicInput,
  accessToken: string,
): Promise<CourseTopic> {
  return postAuth<CourseTopic>(
    `/api/courses/${courseId}/topics`,
    input,
    accessToken,
  )
}

export function createLesson(
  courseId: string,
  input: CreateLessonInput,
  accessToken: string,
): Promise<Lesson> {
  return postAuth<Lesson>(
    `/api/courses/${courseId}/lessons`,
    input,
    accessToken,
  )
}

export function updateTopic(
  topicId: string,
  input: UpdateTopicInput,
  accessToken: string,
): Promise<CourseTopicSummary> {
  return patchAuth<CourseTopicSummary>(
    `/api/topics/${topicId}`,
    input,
    accessToken,
  )
}

export async function deleteTopic(
  topicId: string,
  accessToken: string,
): Promise<void> {
  await deleteAuth<{ id: string }>(`/api/topics/${topicId}`, accessToken)
}

export function updateLesson(
  lessonId: string,
  input: UpdateLessonInput,
  accessToken: string,
): Promise<Lesson> {
  return patchAuth<Lesson>(`/api/lessons/${lessonId}`, input, accessToken)
}

export async function deleteLesson(
  lessonId: string,
  accessToken: string,
): Promise<void> {
  await deleteAuth<{ id: string }>(`/api/lessons/${lessonId}`, accessToken)
}

export function reorderTopics(
  courseId: string,
  topicIds: string[],
  accessToken: string,
): Promise<{ topicIds: string[] }> {
  return patchAuth<{ topicIds: string[] }>(
    `/api/courses/${courseId}/topics/reorder`,
    { topicIds },
    accessToken,
  )
}

export function reorderLessons(
  topicId: string,
  lessonIds: string[],
  accessToken: string,
): Promise<{ lessonIds: string[] }> {
  return patchAuth<{ lessonIds: string[] }>(
    `/api/topics/${topicId}/lessons/reorder`,
    { lessonIds },
    accessToken,
  )
}

export function getTrash(
  courseId: string,
  accessToken: string,
): Promise<CourseTrash> {
  return get<CourseTrash>(`/api/courses/${courseId}/trash`, accessToken)
}

export function restoreTopic(
  topicId: string,
  accessToken: string,
): Promise<CourseTopic> {
  return postAuth<CourseTopic>(
    `/api/topics/${topicId}/restore`,
    {},
    accessToken,
  )
}

export function restoreLesson(
  lessonId: string,
  accessToken: string,
): Promise<Lesson> {
  return postAuth<Lesson>(`/api/lessons/${lessonId}/restore`, {}, accessToken)
}

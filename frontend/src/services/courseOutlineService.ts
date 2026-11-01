import type {
  CourseOutline,
  CourseTopic,
  CreateLessonInput,
  CreateTopicInput,
  Lesson,
} from '../types/courseOutline'
import { get, postAuth } from './apiClient'

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

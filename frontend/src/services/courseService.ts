import type { Course, CreateCourseInput } from '../types/course'
import { get, postAuth } from './apiClient'

export function listCourses(accessToken: string): Promise<Course[]> {
  return get<Course[]>('/api/courses', accessToken)
}

export function createCourse(
  input: CreateCourseInput,
  accessToken: string,
): Promise<Course> {
  return postAuth<Course>('/api/courses', input, accessToken)
}

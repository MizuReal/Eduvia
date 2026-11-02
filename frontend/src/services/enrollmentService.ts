import type {
  CourseEnrollmentWorkspace,
  EnrollmentJoinPreview,
  StudentDashboard,
  StudentSubjectWorkspace,
} from '../types/enrollment'
import type { EnrollmentMode } from '../config/course'
import { deleteAuth, get, patchAuth, postAuth } from './apiClient'

export function getStudentDashboard(
  accessToken: string,
): Promise<StudentDashboard> {
  return get<StudentDashboard>('/api/enrollments/me', accessToken)
}

export function getEnrollmentJoinPreview(
  courseId: string,
  accessToken: string,
): Promise<EnrollmentJoinPreview> {
  return get<EnrollmentJoinPreview>(
    `/api/enrollments/join/${courseId}`,
    accessToken,
  )
}

export function requestEnrollment(
  courseId: string,
  accessToken: string,
): Promise<EnrollmentJoinPreview> {
  return postAuth<EnrollmentJoinPreview>(
    '/api/enrollments',
    { courseId },
    accessToken,
  )
}

export function getStudentSubject(
  courseId: string,
  accessToken: string,
): Promise<StudentSubjectWorkspace> {
  return get<StudentSubjectWorkspace>(
    `/api/student/subjects/${courseId}`,
    accessToken,
  )
}

export function getCourseEnrollments(
  courseId: string,
  accessToken: string,
): Promise<CourseEnrollmentWorkspace> {
  return get<CourseEnrollmentWorkspace>(
    `/api/courses/${courseId}/enrollments`,
    accessToken,
  )
}

export function updateEnrollmentSettings(
  courseId: string,
  input: { open: boolean; mode: EnrollmentMode },
  accessToken: string,
): Promise<CourseEnrollmentWorkspace> {
  return patchAuth<CourseEnrollmentWorkspace>(
    `/api/courses/${courseId}/enrollment-settings`,
    input,
    accessToken,
  )
}

export function approveEnrollment(
  enrollmentId: string,
  accessToken: string,
): Promise<CourseEnrollmentWorkspace> {
  return postAuth<CourseEnrollmentWorkspace>(
    `/api/enrollments/${enrollmentId}/approve`,
    {},
    accessToken,
  )
}

export function rejectEnrollment(
  enrollmentId: string,
  accessToken: string,
): Promise<CourseEnrollmentWorkspace> {
  return postAuth<CourseEnrollmentWorkspace>(
    `/api/enrollments/${enrollmentId}/reject`,
    {},
    accessToken,
  )
}

export function removeEnrollment(
  enrollmentId: string,
  accessToken: string,
): Promise<CourseEnrollmentWorkspace> {
  return deleteAuth<CourseEnrollmentWorkspace>(
    `/api/enrollments/${enrollmentId}`,
    accessToken,
  )
}

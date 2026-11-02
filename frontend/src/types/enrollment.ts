import type { EnrollmentMode, EnrollmentStatus } from '../config/course'
import type { Faculty } from './auth'
import type { Course } from './course'

export type { StudentSubjectWorkspace } from './learning'

export type Enrollment = {
  id: string
  courseId: string
  studentId: string
  status: EnrollmentStatus
  decidedAt: string | null
  removedAt: string | null
  createdAt: string
  updatedAt: string
}

export type EnrollmentStudent = {
  id: string
  username: string
  faculty: Faculty
}

export type CourseEnrollment = Enrollment & {
  student: EnrollmentStudent
}

export type EnrollmentCourse = Course & {
  instructorUsername: string
}

export type StudentEnrollment = Enrollment & {
  course: EnrollmentCourse
}

export type StudentDashboard = {
  active: StudentEnrollment[]
  pending: StudentEnrollment[]
}

export type EnrollmentJoinPreview = {
  course: EnrollmentCourse
  enrollmentOpen: boolean
  enrollmentMode: EnrollmentMode
  status: EnrollmentStatus | null
}

export type CourseEnrollmentWorkspace = {
  course: EnrollmentCourse
  pending: CourseEnrollment[]
  active: CourseEnrollment[]
}

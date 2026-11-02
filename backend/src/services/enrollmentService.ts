import {
  findCourseEnrollmentPreview,
  findEnrollmentForInstructor,
  findStudentEnrollment,
  listEnrollmentsForCourse,
  listEnrollmentsForStudent,
  listStudentEnrollmentCourses,
  listStudentsByIds,
  requestEnrollmentRecord,
  toCourseEnrollmentList,
  updateCourseEnrollmentSettings,
  updateEnrollmentStatus,
} from '../db/enrollments.js'
import { findCourseForInstructor, findCourseIdByJoinCode } from '../db/courses.js'
import { getStudentSubjectWorkspace } from './studentLearningService.js'
import { AppError } from '../errors/AppError.js'
import type { UpdateEnrollmentSettingsInput } from '../schemas/enrollment.js'
import type { AuthenticatedUser } from '../types/auth.js'
import type {
  CourseEnrollmentWorkspace,
  Enrollment,
  EnrollmentCourse,
  EnrollmentJoinPreview,
  StudentDashboard,
  StudentEnrollment,
  StudentSubjectWorkspace,
} from '../types/enrollment.js'

function buildStudentEnrollments(
  enrollments: Enrollment[],
  courses: EnrollmentCourse[],
): StudentEnrollment[] {
  const coursesById = new Map(courses.map((course) => [course.id, course]))

  return enrollments.flatMap((enrollment) => {
    const course = coursesById.get(enrollment.courseId)

    return course ? [{ ...enrollment, course }] : []
  })
}

async function requireOwnedCourse(
  user: AuthenticatedUser,
  courseId: string,
): Promise<EnrollmentCourse> {
  const course = await findCourseForInstructor(courseId, user.id)

  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Subject not found.')
  }

  return { ...course, instructorUsername: user.username }
}

async function buildWorkspace(
  user: AuthenticatedUser,
  courseId: string,
): Promise<CourseEnrollmentWorkspace> {
  const course = await requireOwnedCourse(user, courseId)
  const enrollments = await listEnrollmentsForCourse(courseId)
  const students = await listStudentsByIds([
    ...new Set(enrollments.map((enrollment) => enrollment.studentId)),
  ])
  const entries = toCourseEnrollmentList(enrollments, students)

  return {
    course,
    pending: entries.filter((entry) => entry.status === 'pending'),
    active: entries.filter((entry) => entry.status === 'active'),
  }
}

async function requireEnrollmentForInstructor(
  user: AuthenticatedUser,
  enrollmentId: string,
): Promise<{ enrollment: Enrollment; courseId: string }> {
  const enrollment = await findEnrollmentForInstructor(enrollmentId, user.id)

  if (!enrollment) {
    throw new AppError(404, 'ENROLLMENT_NOT_FOUND', 'Enrollment not found.')
  }

  return {
    enrollment,
    courseId: enrollment.courseId,
  }
}

export async function getStudentDashboard(
  user: AuthenticatedUser,
): Promise<StudentDashboard> {
  const enrollments = await listEnrollmentsForStudent(user.id)
  const visible = enrollments.filter(
    (enrollment) =>
      enrollment.status === 'active' || enrollment.status === 'pending',
  )
  const courses = await listStudentEnrollmentCourses(visible)
  const entries = buildStudentEnrollments(visible, courses)

  return {
    active: entries.filter((entry) => entry.status === 'active'),
    pending: entries.filter((entry) => entry.status === 'pending'),
  }
}

export async function getEnrollmentJoinPreview(
  user: AuthenticatedUser,
  courseId: string,
): Promise<EnrollmentJoinPreview> {
  const course = await findCourseEnrollmentPreview(courseId)

  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Subject not found.')
  }

  const enrollment = await findStudentEnrollment(courseId, user.id)

  return {
    course,
    enrollmentOpen: course.enrollmentOpen,
    enrollmentMode: course.enrollmentMode,
    status: enrollment?.status ?? null,
  }
}

export async function resolveClassCode(
  code: string,
): Promise<{ courseId: string }> {
  const courseId = await findCourseIdByJoinCode(code)

  if (!courseId) {
    throw new AppError(
      404,
      'CLASS_CODE_NOT_FOUND',
      'No subject matches that class code.',
    )
  }

  return { courseId }
}

export async function requestEnrollment(
  user: AuthenticatedUser,
  courseId: string,
): Promise<EnrollmentJoinPreview> {
  const enrollment = await requestEnrollmentRecord(courseId, user.id)
  const course = await findCourseEnrollmentPreview(courseId)

  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Subject not found.')
  }

  return {
    course,
    enrollmentOpen: course.enrollmentOpen,
    enrollmentMode: course.enrollmentMode,
    status: enrollment.status,
  }
}

export async function getStudentSubject(
  user: AuthenticatedUser,
  courseId: string,
): Promise<StudentSubjectWorkspace> {
  return getStudentSubjectWorkspace(user, courseId)
}

export async function getCourseEnrollments(
  user: AuthenticatedUser,
  courseId: string,
): Promise<CourseEnrollmentWorkspace> {
  return buildWorkspace(user, courseId)
}

export async function updateEnrollmentSettings(
  user: AuthenticatedUser,
  courseId: string,
  input: UpdateEnrollmentSettingsInput,
): Promise<CourseEnrollmentWorkspace> {
  await requireOwnedCourse(user, courseId)
  await updateCourseEnrollmentSettings(courseId, input.open, input.mode)
  return buildWorkspace(user, courseId)
}

export async function approveEnrollment(
  user: AuthenticatedUser,
  enrollmentId: string,
): Promise<CourseEnrollmentWorkspace> {
  const { enrollment, courseId } = await requireEnrollmentForInstructor(
    user,
    enrollmentId,
  )

  if (enrollment.status === 'pending') {
    await updateEnrollmentStatus(enrollmentId, 'active', user.id)
  } else if (enrollment.status !== 'active') {
    throw new AppError(
      409,
      'ENROLLMENT_NOT_PENDING',
      'Only pending requests can be approved.',
    )
  }

  return buildWorkspace(user, courseId)
}

export async function rejectEnrollment(
  user: AuthenticatedUser,
  enrollmentId: string,
): Promise<CourseEnrollmentWorkspace> {
  const { enrollment, courseId } = await requireEnrollmentForInstructor(
    user,
    enrollmentId,
  )

  if (enrollment.status !== 'pending') {
    throw new AppError(
      409,
      'ENROLLMENT_NOT_PENDING',
      'Only pending requests can be rejected.',
    )
  }

  await updateEnrollmentStatus(enrollmentId, 'rejected', user.id)

  return buildWorkspace(user, courseId)
}

export async function removeEnrollment(
  user: AuthenticatedUser,
  enrollmentId: string,
): Promise<CourseEnrollmentWorkspace> {
  const { enrollment, courseId } = await requireEnrollmentForInstructor(
    user,
    enrollmentId,
  )

  if (enrollment.status === 'removed') {
    return buildWorkspace(user, courseId)
  }

  if (enrollment.status !== 'active' && enrollment.status !== 'pending') {
    throw new AppError(
      409,
      'ENROLLMENT_NOT_REMOVABLE',
      'This student is not enrolled in the subject.',
    )
  }

  await updateEnrollmentStatus(enrollmentId, 'removed', user.id)

  return buildWorkspace(user, courseId)
}

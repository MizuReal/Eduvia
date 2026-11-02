import { findCourseForInstructor } from './courses.js'
import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import type { Course } from '../types/course.js'
import type {
  CourseEnrollment,
  Enrollment,
  EnrollmentCourse,
  EnrollmentStatus,
  EnrollmentStudent,
} from '../types/enrollment.js'
import type {
  CourseRow,
  EnrollmentRow,
  ProfileRow,
} from './database.types.js'
import { supabaseAdmin } from './supabaseAdmin.js'

const ENROLLMENT_COLUMNS =
  'id, course_id, student_id, status, decided_by, decided_at, removed_by, removed_at, created_at, updated_at'

const COURSE_WITH_INSTRUCTOR_COLUMNS =
  'instructor_id, id, name, code, term, year_level, enrollment_open, enrollment_mode, created_at, updated_at'

type EnrollmentCourseRow = Pick<
  CourseRow,
  | 'instructor_id'
  | 'id'
  | 'name'
  | 'code'
  | 'term'
  | 'year_level'
  | 'enrollment_open'
  | 'enrollment_mode'
  | 'created_at'
  | 'updated_at'
>

type EnrollmentSelectRow = Pick<
  EnrollmentRow,
  | 'id'
  | 'course_id'
  | 'student_id'
  | 'status'
  | 'decided_by'
  | 'decided_at'
  | 'removed_by'
  | 'removed_at'
  | 'created_at'
  | 'updated_at'
>

type StudentProfileRow = Pick<ProfileRow, 'id' | 'username' | 'faculty'>

function toEnrollment(row: EnrollmentSelectRow): Enrollment {
  return {
    id: row.id,
    courseId: row.course_id,
    studentId: row.student_id,
    status: row.status,
    decidedAt: row.decided_at
      ? new Date(row.decided_at).toISOString()
      : null,
    removedAt: row.removed_at
      ? new Date(row.removed_at).toISOString()
      : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

function toStudent(row: StudentProfileRow): EnrollmentStudent {
  return {
    id: row.id,
    username: row.username,
    faculty: row.faculty,
  }
}

async function findInstructorUsernames(
  instructorIds: string[],
): Promise<Map<string, string>> {
  if (instructorIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username')
    .in('id', instructorIds)
    .is('deleted_at', null)

  if (error) {
    logger.error({ err: error }, 'Instructor username lookup failed')
    throw new AppError(
      503,
      'ENROLLMENT_LOAD_FAILED',
      'We could not load the subject teacher. Try again.',
    )
  }

  return new Map((data ?? []).map((row) => [row.id, row.username]))
}

function toEnrollmentCourse(row: EnrollmentCourseRow): Course {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    term: row.term,
    yearLevel: row.year_level,
    enrollmentOpen: row.enrollment_open,
    enrollmentMode: row.enrollment_mode,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

async function attachInstructorUsernames(
  rows: Array<{ instructorId: string; course: EnrollmentCourseRow }>,
): Promise<EnrollmentCourse[]> {
  const usernames = await findInstructorUsernames(
    [...new Set(rows.map((row) => row.instructorId))],
  )

  return rows.map((row) => ({
    ...toEnrollmentCourse(row.course),
    instructorUsername: usernames.get(row.instructorId) ?? 'teacher',
  }))
}

export async function requestEnrollmentRecord(
  courseId: string,
  studentId: string,
): Promise<Enrollment> {
  const { data, error } = await supabaseAdmin.rpc('request_enrollment', {
    target_course_id: courseId,
    target_student_id: studentId,
  })

  if (error) {
    if (error.message.includes('COURSE_NOT_FOUND')) {
      throw new AppError(404, 'COURSE_NOT_FOUND', 'Subject not found.')
    }

    if (error.message.includes('ENROLLMENT_CLOSED')) {
      throw new AppError(
        409,
        'ENROLLMENT_CLOSED',
        'Enrollment is closed for this subject.',
      )
    }

    if (error.message.includes('STUDENT_NOT_FOUND')) {
      throw new AppError(404, 'STUDENT_NOT_FOUND', 'Student not found.')
    }

    logger.error({ err: error, courseId, studentId }, 'Enrollment request failed')
    throw new AppError(
      500,
      'ENROLLMENT_REQUEST_FAILED',
      'We could not enroll you in this subject. Try again.',
    )
  }

  if (!data) {
    logger.error({ courseId, studentId }, 'Enrollment request returned no row')
    throw new AppError(
      500,
      'ENROLLMENT_REQUEST_FAILED',
      'We could not enroll you in this subject. Try again.',
    )
  }

  return toEnrollment(data)
}

export async function listEnrollmentsForStudent(
  studentId: string,
): Promise<Enrollment[]> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(ENROLLMENT_COLUMNS)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error({ err: error, studentId }, 'Student enrollments load failed')
    throw new AppError(
      503,
      'ENROLLMENT_LOAD_FAILED',
      'We could not load your subjects. Try again.',
    )
  }

  return (data ?? []).map(toEnrollment)
}

export async function findStudentEnrollment(
  courseId: string,
  studentId: string,
): Promise<Enrollment | null> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(ENROLLMENT_COLUMNS)
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, courseId, studentId }, 'Enrollment lookup failed')
    throw new AppError(
      503,
      'ENROLLMENT_LOAD_FAILED',
      'We could not load your enrollment. Try again.',
    )
  }

  return data ? toEnrollment(data) : null
}

export async function findEnrollmentById(
  enrollmentId: string,
): Promise<Enrollment | null> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(ENROLLMENT_COLUMNS)
    .eq('id', enrollmentId)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, enrollmentId }, 'Enrollment lookup failed')
    throw new AppError(
      503,
      'ENROLLMENT_LOAD_FAILED',
      'We could not load that enrollment. Try again.',
    )
  }

  return data ? toEnrollment(data) : null
}

export async function findEnrollmentForInstructor(
  enrollmentId: string,
  instructorId: string,
): Promise<Enrollment | null> {
  const enrollment = await findEnrollmentById(enrollmentId)

  if (!enrollment) {
    return null
  }

  const course = await findCourseForInstructor(enrollment.courseId, instructorId)

  return course ? enrollment : null
}

export async function listEnrollmentsForCourse(
  courseId: string,
): Promise<Enrollment[]> {
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .select(ENROLLMENT_COLUMNS)
    .eq('course_id', courseId)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: true })

  if (error) {
    logger.error({ err: error, courseId }, 'Course enrollments load failed')
    throw new AppError(
      503,
      'ENROLLMENT_LOAD_FAILED',
      'We could not load the student list. Try again.',
    )
  }

  return (data ?? []).map(toEnrollment)
}

export async function listStudentsByIds(
  studentIds: string[],
): Promise<Map<string, EnrollmentStudent>> {
  if (studentIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username, faculty')
    .in('id', studentIds)
    .is('deleted_at', null)

  if (error) {
    logger.error({ err: error }, 'Student profile lookup failed')
    throw new AppError(
      503,
      'ENROLLMENT_LOAD_FAILED',
      'We could not load the student list. Try again.',
    )
  }

  return new Map(
    (data ?? []).map((row: StudentProfileRow) => [row.id, toStudent(row)]),
  )
}

export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: EnrollmentStatus,
  actorId: string,
): Promise<Enrollment> {
  const timestamp = new Date().toISOString()
  const patch =
    status === 'removed'
      ? { status, removed_by: actorId, removed_at: timestamp }
      : { status, decided_by: actorId, decided_at: timestamp }

  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .update(patch)
    .eq('id', enrollmentId)
    .select(ENROLLMENT_COLUMNS)
    .single()

  if (error || !data) {
    logger.error({ err: error, enrollmentId, status }, 'Enrollment update failed')
    throw new AppError(
      500,
      'ENROLLMENT_UPDATE_FAILED',
      'We could not update this enrollment. Try again.',
    )
  }

  return toEnrollment(data)
}

export async function updateCourseEnrollmentSettings(
  courseId: string,
  enrollmentOpen: boolean,
  enrollmentMode: 'approval' | 'auto',
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('courses')
    .update({
      enrollment_open: enrollmentOpen,
      enrollment_mode: enrollmentMode,
    })
    .eq('id', courseId)
    .is('deleted_at', null)

  if (error) {
    logger.error({ err: error, courseId }, 'Enrollment settings update failed')
    throw new AppError(
      500,
      'ENROLLMENT_SETTINGS_FAILED',
      'We could not update enrollment settings. Try again.',
    )
  }
}

export async function findCourseEnrollmentPreview(
  courseId: string,
): Promise<EnrollmentCourse | null> {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select(COURSE_WITH_INSTRUCTOR_COLUMNS)
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, courseId }, 'Enrollment preview lookup failed')
    throw new AppError(
      503,
      'ENROLLMENT_LOAD_FAILED',
      'We could not load this subject. Try again.',
    )
  }

  if (!data) {
    return null
  }

  const [course] = await attachInstructorUsernames([
    {
      instructorId: data.instructor_id,
      course: data,
    },
  ])

  return course ?? null
}

export async function listStudentEnrollmentCourses(
  enrollments: Enrollment[],
): Promise<EnrollmentCourse[]> {
  const courseIds = [...new Set(enrollments.map((item) => item.courseId))]

  if (courseIds.length === 0) {
    return []
  }

  const { data, error } = await supabaseAdmin
    .from('courses')
    .select(COURSE_WITH_INSTRUCTOR_COLUMNS)
    .in('id', courseIds)
    .is('deleted_at', null)

  if (error) {
    logger.error({ err: error }, 'Enrollment courses load failed')
    throw new AppError(
      503,
      'ENROLLMENT_LOAD_FAILED',
      'We could not load your subjects. Try again.',
    )
  }

  return attachInstructorUsernames(
    (data ?? []).map((row) => ({
      instructorId: row.instructor_id,
      course: row,
    })),
  )
}

export function toCourseEnrollmentList(
  enrollments: Enrollment[],
  students: Map<string, EnrollmentStudent>,
): CourseEnrollment[] {
  return enrollments.flatMap((enrollment) => {
    const student = students.get(enrollment.studentId)

    return student ? [{ ...enrollment, student }] : []
  })
}

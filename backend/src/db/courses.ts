import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import type { CreateCourseInput } from '../schemas/course.js'
import type { Course, CourseTerm, YearLevel } from '../types/course.js'
import type { CourseRow } from './database.types.js'
import { supabaseAdmin } from './supabaseAdmin.js'

export const COURSE_COLUMNS =
  'id, name, code, term, year_level, enrollment_open, enrollment_mode, created_at, updated_at'

export type CourseSelectRow = Pick<
  CourseRow,
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

export function toCourse(row: CourseSelectRow): Course {
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

export async function findCourseForInstructor(
  courseId: string,
  instructorId: string,
): Promise<Course | null> {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select(COURSE_COLUMNS)
    .eq('id', courseId)
    .eq('instructor_id', instructorId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, courseId, instructorId }, 'Course lookup failed')
    throw new AppError(
      503,
      'COURSE_LOOKUP_FAILED',
      'We could not load that subject. Try again.',
    )
  }

  return data ? toCourse(data) : null
}

export async function listCoursesByInstructor(
  instructorId: string,
): Promise<Course[]> {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select(COURSE_COLUMNS)
    .eq('instructor_id', instructorId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error({ err: error, instructorId }, 'Course list failed')
    throw new AppError(
      503,
      'COURSE_LIST_FAILED',
      'We could not load your subjects. Try again.',
    )
  }

  return (data ?? []).map(toCourse)
}

export async function listCourseCodesForScope(
  instructorId: string,
  term: CourseTerm,
  yearLevel: YearLevel,
): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select('code')
    .eq('instructor_id', instructorId)
    .eq('term', term)
    .eq('year_level', yearLevel)
    .is('deleted_at', null)

  if (error) {
    logger.error(
      { err: error, instructorId, term, yearLevel },
      'Course code lookup failed',
    )
    throw new AppError(
      503,
      'COURSE_CODE_LOOKUP_FAILED',
      'We could not prepare a subject code. Try again.',
    )
  }

  return (data ?? []).map((row) => row.code)
}

export async function insertCourse(
  input: Omit<CreateCourseInput, 'code'> & { code: string },
  instructorId: string,
): Promise<Course> {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .insert({
      instructor_id: instructorId,
      name: input.name,
      code: input.code,
      term: input.term,
      year_level: input.yearLevel,
    })
    .select(COURSE_COLUMNS)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new AppError(
        409,
        'COURSE_CODE_TAKEN',
        'That subject code is already used for this trimester and year level.',
      )
    }

    logger.error({ err: error, instructorId }, 'Course creation failed')
    throw new AppError(
      500,
      'COURSE_CREATION_FAILED',
      'We could not create the subject. Try again.',
    )
  }

  if (!data) {
    logger.error({ instructorId }, 'Course creation returned no row')
    throw new AppError(
      500,
      'COURSE_CREATION_FAILED',
      'We could not create the subject. Try again.',
    )
  }

  return toCourse(data)
}

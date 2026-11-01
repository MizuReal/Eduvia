import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import type { CreateCourseInput } from '../schemas/course.js'
import type { Course } from '../types/course.js'
import type { CourseRow } from './database.types.js'
import { supabaseAdmin } from './supabaseAdmin.js'

const COURSE_COLUMNS =
  'id, name, code, term, year_level, created_at, updated_at'

type CourseSelectRow = Pick<
  CourseRow,
  'id' | 'name' | 'code' | 'term' | 'year_level' | 'created_at' | 'updated_at'
>

function toCourse(row: CourseSelectRow): Course {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    term: row.term,
    yearLevel: row.year_level,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
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

export async function insertCourse(
  input: CreateCourseInput,
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

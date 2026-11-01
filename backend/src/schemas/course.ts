import { z } from 'zod'
import {
  COURSE_CODE_MAX_LENGTH,
  COURSE_CODE_MIN_LENGTH,
  COURSE_CODE_PATTERN,
  COURSE_NAME_MAX_LENGTH,
  COURSE_NAME_MIN_LENGTH,
  COURSE_TERMS,
  YEAR_LEVELS,
} from '../config/constants.js'
import type { CourseTerm, YearLevel } from '../types/course.js'

const courseNameSchema = z
  .string()
  .trim()
  .min(
    COURSE_NAME_MIN_LENGTH,
    `Use ${COURSE_NAME_MIN_LENGTH}–${COURSE_NAME_MAX_LENGTH} characters.`,
  )
  .max(
    COURSE_NAME_MAX_LENGTH,
    `Use ${COURSE_NAME_MIN_LENGTH}–${COURSE_NAME_MAX_LENGTH} characters.`,
  )

const courseCodeSchema = z
  .string()
  .trim()
  .min(
    COURSE_CODE_MIN_LENGTH,
    `Use ${COURSE_CODE_MIN_LENGTH}–${COURSE_CODE_MAX_LENGTH} letters, numbers, or hyphens.`,
  )
  .max(
    COURSE_CODE_MAX_LENGTH,
    `Use ${COURSE_CODE_MIN_LENGTH}–${COURSE_CODE_MAX_LENGTH} letters, numbers, or hyphens.`,
  )
  .regex(
    COURSE_CODE_PATTERN,
    `Use ${COURSE_CODE_MIN_LENGTH}–${COURSE_CODE_MAX_LENGTH} letters, numbers, or hyphens.`,
  )
  .transform((value) => value.toUpperCase())

const optionalCourseCodeSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  courseCodeSchema.optional(),
)

const courseTermSchema = z.enum(COURSE_TERMS, {
  message: 'Select a trimester.',
})

const yearLevelSchema = z.preprocess(
  (value) => (typeof value === 'string' ? Number(value) : value),
  z
    .number()
    .int()
    .refine(
      (value): value is YearLevel => YEAR_LEVELS.includes(value as YearLevel),
      'Select a year level.',
    )
    .transform((value) => value as YearLevel),
)

export const createCourseSchema = z.strictObject({
  name: courseNameSchema,
  code: optionalCourseCodeSchema,
  term: courseTermSchema,
  yearLevel: yearLevelSchema,
})

export type CreateCourseInput = z.infer<typeof createCourseSchema>
export type { CourseTerm, YearLevel }

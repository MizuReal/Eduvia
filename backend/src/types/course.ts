import type { COURSE_TERMS, YEAR_LEVELS } from '../config/constants.js'

export type CourseTerm = (typeof COURSE_TERMS)[number]
export type YearLevel = (typeof YEAR_LEVELS)[number]

export type EnrollmentMode = 'approval' | 'auto'

export type Course = {
  id: string
  name: string
  code: string
  term: CourseTerm
  yearLevel: YearLevel
  enrollmentOpen: boolean
  enrollmentMode: EnrollmentMode
  createdAt: string
  updatedAt: string
}

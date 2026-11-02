import type { CourseTerm, EnrollmentMode, YearLevel } from '../config/course'

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

export type CreateCourseInput = {
  name: string
  code?: string
  term: CourseTerm
  yearLevel: YearLevel
}

import type { CourseTerm, YearLevel } from '../config/course'

export type Course = {
  id: string
  name: string
  code: string
  term: CourseTerm
  yearLevel: YearLevel
  createdAt: string
  updatedAt: string
}

export type CreateCourseInput = {
  name: string
  code?: string
  term: CourseTerm
  yearLevel: YearLevel
}

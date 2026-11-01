import type { Faculty, UserRole } from '../types/auth.js'
import type { CourseTerm, YearLevel } from '../types/course.js'

export type ProfileRow = {
  id: string
  username: string
  faculty: Faculty
  role: UserRole
  tos_version: string
  tos_accepted_at: string
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type ProfileInsert = {
  id: string
  username: string
  faculty: Faculty
  role?: UserRole
  tos_version: string
  tos_accepted_at: string
  deleted_at?: string | null
}

export type CourseRow = {
  id: string
  instructor_id: string
  name: string
  code: string
  term: CourseTerm
  year_level: YearLevel
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type CourseInsert = {
  id?: string
  instructor_id: string
  name: string
  code: string
  term: CourseTerm
  year_level: YearLevel
  deleted_at?: string | null
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: ProfileInsert
        Update: Partial<ProfileInsert>
        Relationships: []
      }
      courses: {
        Row: CourseRow
        Insert: CourseInsert
        Update: Partial<CourseInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      faculty: Faculty
      course_term: CourseTerm
    }
    CompositeTypes: Record<string, never>
  }
}

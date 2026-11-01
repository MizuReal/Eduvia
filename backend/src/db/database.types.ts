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

export type CourseTopicRow = {
  id: string
  course_id: string
  title: string
  order_index: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type CourseTopicInsert = {
  id?: string
  course_id: string
  title: string
  order_index: number
  deleted_at?: string | null
}

export type LessonRow = {
  id: string
  course_id: string
  topic_id: string
  title: string
  order_index: number
  deleted_at: string | null
  deleted_batch_id: string | null
  created_at: string
  updated_at: string
}

export type LessonInsert = {
  id?: string
  course_id: string
  topic_id: string
  title: string
  order_index: number
  deleted_at?: string | null
  deleted_batch_id?: string | null
}

export type FileRow = {
  id: string
  course_id: string
  topic_id: string
  uploaded_by: string
  bucket: string
  storage_path: string
  original_name: string
  mime_type: string
  size_bytes: number
  checksum_sha256: string
  file_class: 'image' | 'document'
  width: number | null
  height: number | null
  status: 'uploading' | 'processing' | 'ready' | 'failed' | 'quarantined'
  content_id: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type FileInsert = {
  id?: string
  course_id: string
  topic_id: string
  uploaded_by: string
  bucket: string
  storage_path: string
  original_name: string
  mime_type: string
  size_bytes: number
  checksum_sha256: string
  file_class: 'image' | 'document'
  width?: number | null
  height?: number | null
  status?: FileRow['status']
  content_id?: string | null
  deleted_at?: string | null
}

export type TopicContentRow = {
  id: string
  course_id: string
  topic_id: string
  kind: 'slides' | 'doc' | 'presentation'
  title: string
  content: unknown
  file_id: string | null
  summary: string | null
  order_index: number
  slide_count: number | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type TopicContentInsert = {
  id?: string
  course_id: string
  topic_id: string
  kind: TopicContentRow['kind']
  title: string
  content: unknown
  file_id?: string | null
  summary?: string | null
  order_index: number
  deleted_at?: string | null
}

export type AuditLogRow = {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  course_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type AuditLogInsert = {
  id?: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  course_id?: string | null
  metadata?: Record<string, unknown>
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
      course_topics: {
        Row: CourseTopicRow
        Insert: CourseTopicInsert
        Update: Partial<CourseTopicInsert>
        Relationships: []
      }
      lessons: {
        Row: LessonRow
        Insert: LessonInsert
        Update: Partial<LessonInsert>
        Relationships: []
      }
      files: {
        Row: FileRow
        Insert: FileInsert
        Update: Partial<FileInsert>
        Relationships: []
      }
      topic_content_items: {
        Row: TopicContentRow
        Insert: TopicContentInsert
        Update: Partial<TopicContentInsert>
        Relationships: []
      }
      audit_logs: {
        Row: AuditLogRow
        Insert: AuditLogInsert
        Update: Partial<AuditLogInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      reorder_course_topics: {
        Args: {
          target_course_id: string
          ordered_ids: string[]
        }
        Returns: undefined
      }
      reorder_topic_lessons: {
        Args: {
          target_topic_id: string
          ordered_ids: string[]
        }
        Returns: undefined
      }
      update_lesson: {
        Args: {
          target_lesson_id: string
          new_title: string | null
          new_topic_id: string | null
        }
        Returns: undefined
      }
      restore_topic: {
        Args: {
          target_topic_id: string
        }
        Returns: undefined
      }
      restore_lesson: {
        Args: {
          target_lesson_id: string
        }
        Returns: undefined
      }
      upsert_topic_presentation: {
        Args: {
          target_course_id: string
          target_topic_id: string
          target_uploaded_by: string
          target_bucket: string
          target_storage_path: string
          target_original_name: string
          target_mime_type: string
          target_size_bytes: number
          target_checksum_sha256: string
          target_title: string
          target_summary: string
          target_actor_id: string
        }
        Returns: { contentId: string; fileId: string }
      }
      update_topic_content: {
        Args: {
          target_content_id: string
          new_title: string
          new_content: unknown
          referenced_file_ids: string[]
        }
        Returns: undefined
      }
      soft_delete_topic_content: {
        Args: {
          target_content_id: string
          target_actor_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      user_role: UserRole
      faculty: Faculty
      course_term: CourseTerm
    }
    CompositeTypes: Record<string, never>
  }
}

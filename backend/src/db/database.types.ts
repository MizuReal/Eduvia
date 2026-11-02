import type { Faculty, UserRole } from '../types/auth.js'
import type { CourseTerm, YearLevel } from '../types/course.js'

export type ProfileRow = {
  id: string
  username: string
  first_name: string
  middle_name: string
  last_name: string
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
  first_name: string
  middle_name: string
  last_name: string
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
  enrollment_open: boolean
  enrollment_mode: 'approval' | 'auto'
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
  enrollment_open?: boolean
  enrollment_mode?: 'approval' | 'auto'
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
  preview_html: string | null
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
  preview_html?: string | null
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

export type QuizRow = {
  id: string
  course_id: string
  topic_id: string
  mode: 'native' | 'document'
  title: string
  instructions: string
  passing_score: number
  status: 'draft' | 'published'
  version: number
  file_id: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type QuizInsert = {
  id?: string
  course_id: string
  topic_id: string
  mode: QuizRow['mode']
  title: string
  instructions: string
  passing_score: number
  status?: QuizRow['status']
  version?: number
  file_id?: string | null
  deleted_at?: string | null
}

export type QuizQuestionRow = {
  id: string
  quiz_id: string
  order_index: number
  prompt: string | null
  option_a: string | null
  option_b: string | null
  option_c: string | null
  option_d: string | null
  correct_option: 'A' | 'B' | 'C' | 'D'
  explanation: string | null
  points: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type QuizQuestionInsert = {
  id?: string
  quiz_id: string
  order_index: number
  prompt?: string | null
  option_a?: string | null
  option_b?: string | null
  option_c?: string | null
  option_d?: string | null
  correct_option: QuizQuestionRow['correct_option']
  explanation?: string | null
  points?: number
  deleted_at?: string | null
}

export type EnrollmentRow = {
  id: string
  course_id: string
  student_id: string
  status: 'pending' | 'active' | 'rejected' | 'removed'
  decided_by: string | null
  decided_at: string | null
  removed_by: string | null
  removed_at: string | null
  created_at: string
  updated_at: string
}

export type EnrollmentInsert = {
  id?: string
  course_id: string
  student_id: string
  status?: EnrollmentRow['status']
  decided_by?: string | null
  decided_at?: string | null
  removed_by?: string | null
  removed_at?: string | null
}

export type TopicProgressRow = {
  id: string
  course_id: string
  topic_id: string
  student_id: string
  presentation_highest_slide_index: number
  slides_highest_slide_index: number
  presentation_completed_at: string | null
  slides_completed_at: string | null
  created_at: string
  updated_at: string
}

export type TopicProgressInsert = {
  id?: string
  course_id: string
  topic_id: string
  student_id: string
  presentation_highest_slide_index?: number
  slides_highest_slide_index?: number
  presentation_completed_at?: string | null
  slides_completed_at?: string | null
}

export type QuizAttemptRow = {
  id: string
  quiz_id: string
  course_id: string
  topic_id: string
  student_id: string
  attempt_number: number
  status: 'in_progress' | 'graded'
  snapshot: Record<string, unknown>
  score: number | null
  max_score: number | null
  percentage: number | null
  passed: boolean | null
  started_at: string
  submitted_at: string | null
  graded_at: string | null
  created_at: string
  updated_at: string
}

export type QuizAttemptInsert = {
  id?: string
  quiz_id: string
  course_id: string
  topic_id: string
  student_id: string
  attempt_number: number
  status?: QuizAttemptRow['status']
  snapshot: Record<string, unknown>
  score?: number | null
  max_score?: number | null
  percentage?: number | null
  passed?: boolean | null
  started_at?: string
  submitted_at?: string | null
  graded_at?: string | null
}

export type AttemptAnswerRow = {
  id: string
  attempt_id: string
  question_id: string
  selected_option: 'A' | 'B' | 'C' | 'D'
  is_correct: boolean | null
  points_awarded: number | null
  created_at: string
  updated_at: string
}

export type AttemptAnswerInsert = {
  id?: string
  attempt_id: string
  question_id: string
  selected_option: AttemptAnswerRow['selected_option']
  is_correct?: boolean | null
  points_awarded?: number | null
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
      quizzes: {
        Row: QuizRow
        Insert: QuizInsert
        Update: Partial<QuizInsert>
        Relationships: []
      }
      quiz_questions: {
        Row: QuizQuestionRow
        Insert: QuizQuestionInsert
        Update: Partial<QuizQuestionInsert>
        Relationships: []
      }
      enrollments: {
        Row: EnrollmentRow
        Insert: EnrollmentInsert
        Update: Partial<EnrollmentInsert>
        Relationships: []
      }
      topic_progress: {
        Row: TopicProgressRow
        Insert: TopicProgressInsert
        Update: Partial<TopicProgressInsert>
        Relationships: []
      }
      quiz_attempts: {
        Row: QuizAttemptRow
        Insert: QuizAttemptInsert
        Update: Partial<QuizAttemptInsert>
        Relationships: []
      }
      attempt_answers: {
        Row: AttemptAnswerRow
        Insert: AttemptAnswerInsert
        Update: Partial<AttemptAnswerInsert>
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
      save_quiz: {
        Args: {
          target_quiz_id: string
          new_title: string
          new_instructions: string
          new_passing_score: number
          new_questions: unknown
        }
        Returns: undefined
      }
      publish_quiz: {
        Args: {
          target_quiz_id: string
          target_actor_id: string
        }
        Returns: QuizRow
      }
      replace_quiz_paper: {
        Args: {
          target_quiz_id: string
          target_course_id: string
          target_topic_id: string
          target_uploaded_by: string
          target_bucket: string
          target_storage_path: string
          target_original_name: string
          target_mime_type: string
          target_size_bytes: number
          target_checksum_sha256: string
          target_preview_html: string | null
          target_actor_id: string
        }
        Returns: { fileId: string }
      }
      remove_quiz_paper: {
        Args: {
          target_quiz_id: string
          target_actor_id: string
        }
        Returns: undefined
      }
      soft_delete_quiz: {
        Args: {
          target_quiz_id: string
          target_actor_id: string
        }
        Returns: undefined
      }
      request_enrollment: {
        Args: {
          target_course_id: string
          target_student_id: string
        }
        Returns: EnrollmentRow
      }
      record_topic_slide_progress: {
        Args: {
          target_course_id: string
          target_topic_id: string
          target_student_id: string
          target_source: 'presentation' | 'slides'
          target_slide_index: number
          target_slide_count: number
        }
        Returns: TopicProgressRow
      }
      create_quiz_attempt: {
        Args: {
          target_quiz_id: string
          target_course_id: string
          target_topic_id: string
          target_student_id: string
          target_snapshot: unknown
        }
        Returns: QuizAttemptRow
      }
      save_quiz_attempt_answers: {
        Args: {
          target_attempt_id: string
          target_student_id: string
          target_answers: unknown
        }
        Returns: undefined
      }
      grade_quiz_attempt: {
        Args: {
          target_attempt_id: string
          target_student_id: string
          target_grades: unknown
          target_score: number
          target_max_score: number
          target_percentage: number
          target_passed: boolean
        }
        Returns: QuizAttemptRow
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

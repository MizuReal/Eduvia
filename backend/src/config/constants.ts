export const AUTH_EMAIL_DOMAIN = 'students.eduvia.example.com'
export const CURRENT_TOS_VERSION = '1.0'

export const FACULTIES = ['BSIT', 'BSEE', 'BSME'] as const

export const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{2,19}$/
export const PASSWORD_PATTERN =
  /^(?=\S{8,72}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/

export const COURSE_TERMS = [
  'first_trimester',
  'second_trimester',
  'third_trimester',
] as const
export const YEAR_LEVELS = [1, 2, 3, 4] as const
export const COURSE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,19}$/i
export const COURSE_NAME_MIN_LENGTH = 3
export const COURSE_NAME_MAX_LENGTH = 120
export const COURSE_CODE_MIN_LENGTH = 3
export const COURSE_CODE_MAX_LENGTH = 20

export const TOPIC_TITLE_MIN_LENGTH = 2
export const TOPIC_TITLE_MAX_LENGTH = 120
export const LESSON_TITLE_MIN_LENGTH = 2
export const LESSON_TITLE_MAX_LENGTH = 160
export const INITIAL_ORDER_INDEX = 0
export const MAX_GENERATED_CODE_ATTEMPTS = 20

export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
export const AUTH_RATE_LIMIT_MAX = 10
export const JSON_BODY_LIMIT = '1mb'

export const COURSE_FILES_BUCKET = 'course-files'
export const UPLOAD_FIELD_NAME = 'file'

export const PRESENTATION_EXTENSIONS = ['.pptx', '.pdf'] as const
export const PRESENTATION_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.pptx',
  '.txt',
  '.md',
] as const
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
] as const

export const CONTENT_TITLE_MIN_LENGTH = 2
export const CONTENT_TITLE_MAX_LENGTH = 160
export const PRESENTATION_SUMMARY_MIN_LENGTH = 20
export const PRESENTATION_SUMMARY_MAX_LENGTH = 1000
export const MIN_QUIZ_QUESTIONS = 10
export const MAX_QUIZ_QUESTIONS = 20
export const QUIZ_INSTRUCTIONS_MAX_LENGTH = 5000
export const QUIZ_PROMPT_MIN_LENGTH = 2
export const QUIZ_PROMPT_MAX_LENGTH = 2000
export const QUIZ_OPTION_MAX_LENGTH = 500
export const QUIZ_EXPLANATION_MAX_LENGTH = 2000
export const QUIZ_DEFAULT_PASSING_SCORE = 75
export const QUIZ_PREVIEW_HTML_MAX_BYTES = 2 * 1024 * 1024
export const MAX_DOCX_ENTRIES = 2000
export const MAX_DOCX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024
export const DOCX_CONVERSION_TIMEOUT_MS = 5000
export const QUIZ_PAPER_EXTENSIONS = ['.pdf', '.docx'] as const
export const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const CONTENT_JSON_MAX_BYTES = 512 * 1024
export const CONTENT_MAX_ASSETS = 50
export const SLIDES_DOCUMENT_VERSION = 1
export const SLIDES_MAX_SLIDES = 80
export const TIPTAP_MAX_NODES = 20_000
export const TIPTAP_MAX_DEPTH = 50
export const TIPTAP_MAX_TEXT_LENGTH = 100_000
export const IMAGE_MAX_DIMENSION = 10_000
export const ENROLLMENT_MODES = ['approval', 'auto'] as const

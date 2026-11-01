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

export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
export const AUTH_RATE_LIMIT_MAX = 10
export const JSON_BODY_LIMIT = '1mb'

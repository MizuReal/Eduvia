export const AUTH_EMAIL_DOMAIN = 'students.eduvia.example.com'
export const CURRENT_TOS_VERSION = '1.0'

export const FACULTIES = ['BSIT', 'BSEE', 'BSME'] as const

export const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{2,19}$/
export const PASSWORD_PATTERN =
  /^(?=\S{8,72}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/

export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
export const AUTH_RATE_LIMIT_MAX = 10
export const JSON_BODY_LIMIT = '1mb'

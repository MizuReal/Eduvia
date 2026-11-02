import type { Faculty } from '../types/auth'

// Keep AUTH_EMAIL_DOMAIN and CURRENT_TOS_VERSION in sync with
// backend/src/config/constants.ts.
export const AUTH_EMAIL_DOMAIN = 'students.eduvia.example.com'
export const CURRENT_TOS_VERSION = '1.0'

export const FACULTIES = ['BSIT', 'BSEE', 'BSME'] as const

export const FACULTY_OPTIONS: readonly { value: Faculty; label: string }[] = [
  { value: 'BSIT', label: 'BSIT — Information Technology' },
  { value: 'BSEE', label: 'BSEE — Electrical Engineering' },
  { value: 'BSME', label: 'BSME — Mechanical Engineering' },
]

export const TUPT_USERNAME_PATTERN = /^TUPT-\d{2}-\d{4}$/i
export const LEGACY_USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{2,19}$/
export const LOGIN_USERNAME_PATTERN =
  /^(?:TUPT-\d{2}-\d{4}|[A-Za-z][A-Za-z0-9_]{2,19})$/i

export const REGISTRATION_ROLES = ['student', 'instructor'] as const
export const NAME_MAX_LENGTH = 100
export const NAME_PATTERN = /^[\p{L}][\p{L}\p{M} .'-]*$/u

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

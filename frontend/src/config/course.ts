// Keep these values in sync with backend/src/config/constants.ts.
export const COURSE_TERMS = [
  'first_trimester',
  'second_trimester',
  'third_trimester',
] as const

export type CourseTerm = (typeof COURSE_TERMS)[number]

export const ENROLLMENT_MODES = ['approval', 'auto'] as const

export type EnrollmentMode = (typeof ENROLLMENT_MODES)[number]

export const ENROLLMENT_STATUSES = [
  'pending',
  'active',
  'rejected',
  'removed',
] as const

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export const YEAR_LEVELS = [1, 2, 3, 4] as const

export type YearLevel = (typeof YEAR_LEVELS)[number]

export const COURSE_NAME_MIN_LENGTH = 3
export const COURSE_NAME_MAX_LENGTH = 120
export const COURSE_CODE_MIN_LENGTH = 3
export const COURSE_CODE_MAX_LENGTH = 20
export const COURSE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,19}$/i
export const CLASS_CODE_LENGTH = 6
export const CLASS_CODE_PATTERN = /^[A-Za-z0-9]{6}$/

export const TOPIC_TITLE_MIN_LENGTH = 2
export const TOPIC_TITLE_MAX_LENGTH = 120
export const LESSON_TITLE_MIN_LENGTH = 2
export const LESSON_TITLE_MAX_LENGTH = 160

export const COURSE_TERM_OPTIONS: readonly {
  value: CourseTerm
  label: string
}[] = [
  { value: 'first_trimester', label: '1st Trimester' },
  { value: 'second_trimester', label: '2nd Trimester' },
  { value: 'third_trimester', label: '3rd Trimester' },
]

export const YEAR_LEVEL_OPTIONS: readonly {
  value: YearLevel
  label: string
}[] = [
  { value: 1, label: '1st Year' },
  { value: 2, label: '2nd Year' },
  { value: 3, label: '3rd Year' },
  { value: 4, label: '4th Year' },
]

export const ENROLLMENT_MODE_OPTIONS: readonly {
  value: EnrollmentMode
  label: string
  description: string
}[] = [
  {
    value: 'approval',
    label: 'Approve requests',
    description: 'Students join after you approve their request.',
  },
  {
    value: 'auto',
    label: 'Auto-accept',
    description: 'Students join immediately through the invite link.',
  },
]

export const ENROLLMENT_MODE_LABELS: Record<EnrollmentMode, string> = {
  approval: 'Approval required',
  auto: 'Auto-accept',
}

const COURSE_TERM_LABELS: Record<CourseTerm, string> = {
  first_trimester: '1st Trimester',
  second_trimester: '2nd Trimester',
  third_trimester: '3rd Trimester',
}

const YEAR_LEVEL_LABELS: Record<YearLevel, string> = {
  1: '1st Year',
  2: '2nd Year',
  3: '3rd Year',
  4: '4th Year',
}

export function courseTermLabel(term: CourseTerm): string {
  return COURSE_TERM_LABELS[term]
}

export function yearLevelLabel(yearLevel: YearLevel): string {
  return YEAR_LEVEL_LABELS[yearLevel]
}

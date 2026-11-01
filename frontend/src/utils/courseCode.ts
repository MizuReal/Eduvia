import {
  COURSE_CODE_MAX_LENGTH,
  COURSE_CODE_MIN_LENGTH,
} from '../config/course'

// Keep this in sync with backend/src/utils/courseCode.ts. The server remains
// authoritative for the final code and collision suffix.
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'the',
  'to',
  'with',
])

const FALLBACK_CODE = 'SUBJ'

function normalizeWords(name: string): string[] {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()

  return normalized.length > 0 ? normalized.split(/\s+/) : []
}

function initials(words: readonly string[]): string {
  return words.map((word) => word[0] ?? '').join('')
}

export function suggestCourseCode(name: string): string {
  const words = normalizeWords(name)

  if (words.length === 0) {
    return FALLBACK_CODE
  }

  const significantWords = words.filter(
    (word) => !STOP_WORDS.has(word.toLowerCase()),
  )
  const primaryWords = significantWords.length > 0 ? significantWords : words

  let base = initials(primaryWords)

  if (base.length < COURSE_CODE_MIN_LENGTH) {
    const allInitials = initials(words)

    if (allInitials.length >= COURSE_CODE_MIN_LENGTH) {
      base = allInitials
    }
  }

  if (base.length < COURSE_CODE_MIN_LENGTH) {
    base = primaryWords.join('').slice(0, COURSE_CODE_MIN_LENGTH)
  }

  if (base.length < COURSE_CODE_MIN_LENGTH) {
    base = base.padEnd(COURSE_CODE_MIN_LENGTH, 'X')
  }

  return base.slice(0, COURSE_CODE_MAX_LENGTH)
}

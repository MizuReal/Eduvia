import {
  COURSE_CODE_MAX_LENGTH,
  COURSE_CODE_MIN_LENGTH,
} from '../config/constants.js'

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

export function withCodeSuffix(base: string, suffix: number): string {
  const suffixText = `-${suffix}`
  const maxBaseLength = COURSE_CODE_MAX_LENGTH - suffixText.length
  const trimmedBase = base.slice(0, Math.max(1, maxBaseLength))

  return `${trimmedBase}${suffixText}`
}

export function nextAvailableCourseCode(
  base: string,
  usedCodes: ReadonlySet<string>,
): string {
  if (!usedCodes.has(base)) {
    return base
  }

  let suffix = 2

  while (usedCodes.has(withCodeSuffix(base, suffix))) {
    suffix += 1
  }

  return withCodeSuffix(base, suffix)
}

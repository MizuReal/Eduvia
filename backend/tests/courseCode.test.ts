import { describe, expect, it } from 'vitest'
import {
  nextAvailableCourseCode,
  suggestCourseCode,
  withCodeSuffix,
} from '../src/utils/courseCode.js'

describe('suggestCourseCode', () => {
  it('uses meaningful initials', () => {
    expect(suggestCourseCode('Web Systems and Technologies')).toBe('WST')
    expect(suggestCourseCode('Data Structures and Algorithms')).toBe('DSA')
  })

  it('uses all initials when meaningful initials are too short', () => {
    expect(suggestCourseCode('Introduction to Computing')).toBe('ITC')
    expect(suggestCourseCode('Fundamentals of Programming')).toBe('FOP')
  })

  it('uses the first letters of a single word', () => {
    expect(suggestCourseCode('Mathematics')).toBe('MAT')
    expect(suggestCourseCode('ITPE2')).toBe('ITP')
  })

  it('normalizes accents and punctuation', () => {
    expect(suggestCourseCode('Español I')).toBe('ESP')
    expect(suggestCourseCode('  Web   Systems! ')).toBe('WEB')
  })

  it('falls back for names without alphanumeric characters', () => {
    expect(suggestCourseCode('!!!')).toBe('SUBJ')
  })

  it('caps the generated code at the maximum length', () => {
    const longName = Array.from(
      { length: 25 },
      (_, index) => `Word${index}`,
    ).join(' ')

    expect(suggestCourseCode(longName)).toHaveLength(20)
  })
})

describe('course code suffixes', () => {
  it('adds a suffix that fits the maximum length', () => {
    const code = withCodeSuffix('ABCDEFGHIJKLMNOPQRST', 2)

    expect(code).toBe('ABCDEFGHIJKLMNOPQR-2')
    expect(code).toHaveLength(20)
  })

  it('returns the next unused code', () => {
    expect(nextAvailableCourseCode('WST', new Set())).toBe('WST')
    expect(nextAvailableCourseCode('WST', new Set(['WST']))).toBe('WST-2')
    expect(nextAvailableCourseCode('WST', new Set(['WST', 'WST-2']))).toBe(
      'WST-3',
    )
  })
})

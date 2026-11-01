import { describe, expect, it } from 'vitest'
import { suggestCourseCode } from '../utils/courseCode'

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
})

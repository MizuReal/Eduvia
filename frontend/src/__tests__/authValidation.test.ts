import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from '../schemas/auth'

const validRegistration = {
  role: 'student',
  firstName: 'Juan',
  middleName: 'Dela',
  lastName: 'Cruz',
  username: 'TUPT-25-1234',
  password: 'Secret123!',
  faculty: 'BSIT',
  tosAccepted: true,
}

describe('auth validation', () => {
  it('accepts a valid student registration and normalizes the username', () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      username: 'tupt-25-1234',
    })

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data.username).toBe('TUPT-25-1234')
      expect(result.data.firstName).toBe('Juan')
      expect(result.data.middleName).toBe('Dela')
      expect(result.data.lastName).toBe('Cruz')
    }
  })

  it('rejects usernames outside TUPT-XX-XXXX', () => {
    for (const username of [
      'juan_delacruz',
      'TUPT-2-1234',
      'TUPT-25-123',
      'TUPT-25-12345',
      'TUPT-XX-1234',
      'TUPT-25-ABCD',
      'AB-25-1234',
    ]) {
      expect(
        registerSchema.safeParse({ ...validRegistration, username }).success,
      ).toBe(false)
    }
  })

  it('requires all three name fields', () => {
    for (const field of ['firstName', 'middleName', 'lastName'] as const) {
      expect(
        registerSchema.safeParse({ ...validRegistration, [field]: '' })
          .success,
      ).toBe(false)
    }
  })

  it('requires every password character class and no spaces', () => {
    for (const password of [
      'short1!',
      'secret123!',
      'SECRET123!',
      'Secret!',
      'Secret123',
      'Secret 123!',
      `${'Aa1!'.repeat(19)}a`,
    ]) {
      expect(
        registerSchema.safeParse({ ...validRegistration, password }).success,
      ).toBe(false)
    }
  })

  it('requires a known faculty, a role, and the consent checkbox', () => {
    expect(
      registerSchema.safeParse({ ...validRegistration, faculty: 'BSCS' })
        .success,
    ).toBe(false)
    expect(
      registerSchema.safeParse({ ...validRegistration, role: 'admin' }).success,
    ).toBe(false)
    expect(
      registerSchema.safeParse({ ...validRegistration, tosAccepted: false })
        .success,
    ).toBe(false)
  })

  it('requires a teacher access code only for instructor registration', () => {
    expect(
      registerSchema.safeParse({
        ...validRegistration,
        role: 'instructor',
      }).success,
    ).toBe(false)
    expect(
      registerSchema.safeParse({
        ...validRegistration,
        role: 'instructor',
        teacherAccessCode: 'teacher-code',
      }).success,
    ).toBe(true)
    expect(
      registerSchema.safeParse({
        ...validRegistration,
        role: 'student',
        teacherAccessCode: 'teacher-code',
      }).success,
    ).toBe(true)
  })

  it('validates TUPT and legacy login usernames', () => {
    expect(
      loginSchema.safeParse({
        username: 'TUPT-25-1234',
        password: 'anything',
      }).success,
    ).toBe(true)
    expect(
      loginSchema.safeParse({
        username: 'juan_delacruz',
        password: 'anything',
      }).success,
    ).toBe(true)
    expect(
      loginSchema.safeParse({ username: 'Juan', password: '' }).success,
    ).toBe(false)
    expect(
      loginSchema.safeParse({ username: '1juan', password: 'anything' })
        .success,
    ).toBe(false)
  })
})

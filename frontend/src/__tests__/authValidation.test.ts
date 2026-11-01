import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from '../schemas/auth'

const validRegistration = {
  username: 'Juan_DelaCruz',
  password: 'Secret123!',
  faculty: 'BSIT',
  tosAccepted: true,
}

describe('auth validation', () => {
  it('accepts and lowercases a valid registration', () => {
    const result = registerSchema.safeParse(validRegistration)

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data.username).toBe('juan_delacruz')
    }
  })

  it('rejects malformed usernames', () => {
    for (const username of ['1juan', 'ab', 'juan-doe', 'juan!', 'a'.repeat(21)]) {
      expect(
        registerSchema.safeParse({ ...validRegistration, username }).success,
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

  it('requires a known faculty and the consent checkbox', () => {
    expect(
      registerSchema.safeParse({ ...validRegistration, faculty: 'BSCS' }).success,
    ).toBe(false)
    expect(
      registerSchema.safeParse({ ...validRegistration, tosAccepted: false }).success,
    ).toBe(false)
  })

  it('rejects extra privilege fields', () => {
    expect(
      registerSchema.safeParse({ ...validRegistration, role: 'admin' }).success,
    ).toBe(false)
  })

  it('validates login username format and requires a password', () => {
    expect(
      loginSchema.safeParse({ username: 'Juan', password: 'anything' }).success,
    ).toBe(true)
    expect(
      loginSchema.safeParse({ username: 'Juan', password: '' }).success,
    ).toBe(false)
    expect(
      loginSchema.safeParse({ username: '1juan', password: 'anything' }).success,
    ).toBe(false)
  })
})

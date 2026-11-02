import { SignJWT } from 'jose'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { env } from '../src/config/env.js'
import { AppError } from '../src/errors/AppError.js'

const {
  createProfileMock,
  createUserMock,
  deleteUserMock,
  findProfileByIdMock,
  findProfileByUsernameMock,
} = vi.hoisted(() => ({
  createProfileMock: vi.fn(),
  createUserMock: vi.fn(),
  deleteUserMock: vi.fn(),
  findProfileByIdMock: vi.fn(),
  findProfileByUsernameMock: vi.fn(),
}))

vi.mock('../src/db/profiles.js', () => ({
  createProfile: createProfileMock,
  findProfileById: findProfileByIdMock,
  findProfileByUsername: findProfileByUsernameMock,
}))

vi.mock('../src/db/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: createUserMock,
        deleteUser: deleteUserMock,
      },
    },
  },
}))

const app = createApp()

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

const userRow = {
  id: 'user-1',
  username: 'tupt-25-1234',
  first_name: 'Juan',
  middle_name: 'Dela',
  last_name: 'Cruz',
  faculty: 'BSIT',
  role: 'student',
  tos_version: '1.0',
  tos_accepted_at: '2026-11-01T00:00:00.000Z',
  deleted_at: null,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

function resetMocks(): void {
  createProfileMock.mockReset()
  createUserMock.mockReset()
  deleteUserMock.mockReset()
  findProfileByIdMock.mockReset()
  findProfileByUsernameMock.mockReset()
}

async function signTestToken(): Promise<string> {
  if (!env.SUPABASE_JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET is required for backend tests')
  }

  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-1')
    .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(env.SUPABASE_JWT_SECRET))
}

describe('POST /api/auth/register', () => {
  beforeEach(resetMocks)

  it('creates an auth user and a student profile', async () => {
    findProfileByUsernameMock.mockResolvedValue(null)
    createUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    createProfileMock.mockResolvedValue(undefined)

    const response = await request(app)
      .post('/api/auth/register')
      .send(validRegistration)

    expect(response.status).toBe(201)
    expect(response.body.error).toBeNull()
    expect(response.body.data).toEqual({
      id: 'user-1',
      username: 'tupt-25-1234',
      email: 'tupt-25-1234@students.eduvia.example.com',
      firstName: 'Juan',
      middleName: 'Dela',
      lastName: 'Cruz',
      role: 'student',
      faculty: 'BSIT',
      tosAcceptedAt: expect.any(String),
    })
    expect(response.body.data).not.toHaveProperty('password')
    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'tupt-25-1234@students.eduvia.example.com',
        password: 'Secret123!',
        email_confirm: true,
        user_metadata: expect.objectContaining({
          username: 'tupt-25-1234',
          first_name: 'Juan',
          middle_name: 'Dela',
          last_name: 'Cruz',
          role: 'student',
          faculty: 'BSIT',
          tos_version: '1.0',
          tos_accepted_at: expect.any(String),
        }),
      }),
    )
    expect(createProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        username: 'tupt-25-1234',
        firstName: 'Juan',
        middleName: 'Dela',
        lastName: 'Cruz',
        faculty: 'BSIT',
        role: 'student',
        tosVersion: '1.0',
        tosAcceptedAt: expect.any(String),
      }),
    )
  })

  it('creates an instructor profile when the teacher access code matches', async () => {
    findProfileByUsernameMock.mockResolvedValue(null)
    createUserMock.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    createProfileMock.mockResolvedValue(undefined)

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...validRegistration,
        role: 'instructor',
        teacherAccessCode: 'test-teacher-code-at-least-16',
      })

    expect(response.status).toBe(201)
    expect(response.body.data.role).toBe('instructor')
    expect(createProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'instructor' }),
    )
    expect(createUserMock.mock.calls[0]?.[0].user_metadata).not.toHaveProperty(
      'teacherAccessCode',
    )
  })

  it('rejects an incorrect teacher access code before creating the user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        ...validRegistration,
        role: 'instructor',
        teacherAccessCode: 'wrong-teacher-code',
      })

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('INVALID_TEACHER_CODE')
    expect(response.body.error.details).toContainEqual({
      path: 'teacherAccessCode',
      message: 'The teacher access code is invalid.',
    })
    expect(findProfileByUsernameMock).not.toHaveBeenCalled()
    expect(createUserMock).not.toHaveBeenCalled()
    expect(createProfileMock).not.toHaveBeenCalled()
  })

  it('requires a teacher access code when registering as an instructor', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...validRegistration, role: 'instructor' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(createUserMock).not.toHaveBeenCalled()
  })

  it('rejects malformed fields and extra privilege fields', async () => {
    const response = await request(app).post('/api/auth/register').send({
      username: '1bad',
      password: 'weak',
      faculty: 'BSCS',
      tosAccepted: false,
      role: 'admin',
    })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(response.body.error.details.length).toBeGreaterThan(0)
    expect(createUserMock).not.toHaveBeenCalled()
    expect(createProfileMock).not.toHaveBeenCalled()
  })

  it('rejects legacy-style usernames for new registrations', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...validRegistration, username: 'juan_delacruz' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(createUserMock).not.toHaveBeenCalled()
  })

  it('returns 409 when the username already has a profile', async () => {
    findProfileByUsernameMock.mockResolvedValue({ id: 'existing' })

    const response = await request(app)
      .post('/api/auth/register')
      .send(validRegistration)

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('USERNAME_TAKEN')
    expect(createUserMock).not.toHaveBeenCalled()
  })

  it('maps a Supabase email collision to 409', async () => {
    findProfileByUsernameMock.mockResolvedValue(null)
    createUserMock.mockResolvedValue({
      data: { user: null },
      error: { code: 'email_exists', status: 422, message: 'Email exists' },
    })

    const response = await request(app)
      .post('/api/auth/register')
      .send(validRegistration)

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('USERNAME_TAKEN')
  })

  it('rolls back the auth user when profile creation fails', async () => {
    findProfileByUsernameMock.mockResolvedValue(null)
    createUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    createProfileMock.mockRejectedValue(
      new AppError(500, 'PROFILE_CREATION_FAILED', 'Profile insert failed'),
    )
    deleteUserMock.mockResolvedValue({ data: {}, error: null })

    const response = await request(app)
      .post('/api/auth/register')
      .send(validRegistration)

    expect(response.status).toBe(500)
    expect(response.body.error.code).toBe('PROFILE_CREATION_FAILED')
    expect(deleteUserMock).toHaveBeenCalledWith('user-1')
    expect(response.body.error.message).not.toContain('Profile insert failed')
  })
})

describe('GET /api/users/me', () => {
  beforeEach(resetMocks)

  it('requires a bearer token', async () => {
    const response = await request(app).get('/api/users/me')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('AUTH_REQUIRED')
  })

  it('rejects an invalid token', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer not-a-token')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('INVALID_TOKEN')
  })

  it('returns the current profile for a valid token', async () => {
    findProfileByIdMock.mockResolvedValue(userRow)
    const token = await signTestToken()

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        id: 'user-1',
        username: 'tupt-25-1234',
        firstName: 'Juan',
        middleName: 'Dela',
        lastName: 'Cruz',
        role: 'student',
        faculty: 'BSIT',
      },
      error: null,
    })
  })

  it('rejects a token with no profile', async () => {
    findProfileByIdMock.mockResolvedValue(null)
    const token = await signTestToken()

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('ACCOUNT_NOT_FOUND')
  })

  it('rejects a soft-deleted profile', async () => {
    findProfileByIdMock.mockResolvedValue({
      ...userRow,
      deleted_at: '2026-11-01T00:00:00.000Z',
    })
    const token = await signTestToken()

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('ACCOUNT_NOT_FOUND')
  })
})

import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { AppError } from '../src/errors/AppError.js'
import { signTestToken } from '../src/test/authToken.js'

const { findProfileByIdMock, insertCourseMock, listCoursesByInstructorMock } =
  vi.hoisted(() => ({
    findProfileByIdMock: vi.fn(),
    insertCourseMock: vi.fn(),
    listCoursesByInstructorMock: vi.fn(),
  }))

vi.mock('../src/db/courses.js', () => ({
  insertCourse: insertCourseMock,
  listCoursesByInstructor: listCoursesByInstructorMock,
}))

vi.mock('../src/db/profiles.js', () => ({
  createProfile: vi.fn(),
  findProfileById: findProfileByIdMock,
  findProfileByUsername: vi.fn(),
}))

const app = createApp()

const instructorProfile = {
  id: 'user-1',
  username: 'teacher_one',
  faculty: 'BSIT',
  role: 'instructor',
  tos_version: '1.0',
  tos_accepted_at: '2026-11-01T00:00:00.000Z',
  deleted_at: null,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

const studentProfile = {
  ...instructorProfile,
  username: 'student_one',
  role: 'student',
}

const validInput = {
  name: 'Web Systems',
  code: 'IT301',
  term: 'first_trimester',
  yearLevel: 3,
}

const course = {
  id: 'course-1',
  name: 'Web Systems',
  code: 'IT301',
  term: 'first_trimester',
  yearLevel: 3,
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
}

describe('courses API', () => {
  beforeEach(() => {
    findProfileByIdMock.mockReset()
    insertCourseMock.mockReset()
    listCoursesByInstructorMock.mockReset()
    findProfileByIdMock.mockResolvedValue(instructorProfile)
  })

  it('requires authentication', async () => {
    const response = await request(app).post('/api/courses').send(validInput)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('AUTH_REQUIRED')
    expect(insertCourseMock).not.toHaveBeenCalled()
  })

  it('rejects student accounts', async () => {
    findProfileByIdMock.mockResolvedValue(studentProfile)
    const token = await signTestToken()

    const response = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send(validInput)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
    expect(insertCourseMock).not.toHaveBeenCalled()
  })

  it('validates the request body', async () => {
    const token = await signTestToken()

    const response = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'x',
        code: '!',
        term: 'summer',
        yearLevel: 9,
      })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(response.body.error.details.length).toBeGreaterThan(0)
    expect(insertCourseMock).not.toHaveBeenCalled()
  })

  it('creates a course and normalizes the subject code', async () => {
    insertCourseMock.mockResolvedValue(course)
    const token = await signTestToken()

    const response = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validInput, code: 'it301' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: course, error: null })
    expect(insertCourseMock).toHaveBeenCalledWith(
      { ...validInput, code: 'IT301' },
      'user-1',
    )
  })

  it('maps a duplicate subject code to 409', async () => {
    insertCourseMock.mockRejectedValue(
      new AppError(
        409,
        'COURSE_CODE_TAKEN',
        'That subject code is already used for this trimester and year level.',
      ),
    )
    const token = await signTestToken()

    const response = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send(validInput)

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('COURSE_CODE_TAKEN')
  })

  it('lists only the authenticated instructor courses', async () => {
    listCoursesByInstructorMock.mockResolvedValue([course])
    const token = await signTestToken()

    const response = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: [course], error: null })
    expect(listCoursesByInstructorMock).toHaveBeenCalledWith('user-1')
  })
})

import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { signTestToken } from '../src/test/authToken.js'

const {
  findCourseForInstructorMock,
  findProfileByIdMock,
  findTopicForCourseMock,
  getNextLessonOrderIndexMock,
  getNextTopicOrderIndexMock,
  insertLessonMock,
  insertTopicMock,
  listTopicsAndLessonsMock,
} = vi.hoisted(() => ({
  findCourseForInstructorMock: vi.fn(),
  findProfileByIdMock: vi.fn(),
  findTopicForCourseMock: vi.fn(),
  getNextLessonOrderIndexMock: vi.fn(),
  getNextTopicOrderIndexMock: vi.fn(),
  insertLessonMock: vi.fn(),
  insertTopicMock: vi.fn(),
  listTopicsAndLessonsMock: vi.fn(),
}))

vi.mock('../src/db/courses.js', () => ({
  findCourseForInstructor: findCourseForInstructorMock,
  insertCourse: vi.fn(),
  listCoursesByInstructor: vi.fn(),
}))

vi.mock('../src/db/courseOutline.js', () => ({
  findTopicForCourse: findTopicForCourseMock,
  getNextLessonOrderIndex: getNextLessonOrderIndexMock,
  getNextTopicOrderIndex: getNextTopicOrderIndexMock,
  insertLesson: insertLessonMock,
  insertTopic: insertTopicMock,
  listTopicsAndLessons: listTopicsAndLessonsMock,
}))

vi.mock('../src/db/profiles.js', () => ({
  createProfile: vi.fn(),
  findProfileById: findProfileByIdMock,
  findProfileByUsername: vi.fn(),
}))

const app = createApp()

const courseId = 'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8'
const topicId = '11111111-1111-4111-8111-111111111111'
const lessonId = '22222222-2222-4222-8222-222222222222'

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

const course = {
  id: courseId,
  name: 'ITPE2',
  code: 'IT-ITPE2',
  term: 'first_trimester',
  yearLevel: 3,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

const lesson = {
  id: lessonId,
  topicId,
  title: 'Semantic HTML',
  orderIndex: 0,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

const topic = {
  id: topicId,
  title: 'HTML and CSS',
  orderIndex: 0,
  lessons: [lesson],
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

const newTopic = {
  id: '33333333-3333-4333-8333-333333333333',
  title: 'JavaScript',
  orderIndex: 1,
  lessons: [],
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
}

const newLesson = {
  id: '44444444-4444-4444-8444-444444444444',
  topicId,
  title: 'Flexbox',
  orderIndex: 1,
  createdAt: '2026-11-02T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
}

describe('course outline API', () => {
  beforeEach(() => {
    findCourseForInstructorMock.mockReset()
    findProfileByIdMock.mockReset()
    findTopicForCourseMock.mockReset()
    getNextLessonOrderIndexMock.mockReset()
    getNextTopicOrderIndexMock.mockReset()
    insertLessonMock.mockReset()
    insertTopicMock.mockReset()
    listTopicsAndLessonsMock.mockReset()

    findProfileByIdMock.mockResolvedValue(instructorProfile)
    findCourseForInstructorMock.mockResolvedValue(course)
    findTopicForCourseMock.mockResolvedValue({ id: topicId })
    getNextLessonOrderIndexMock.mockResolvedValue(1)
    getNextTopicOrderIndexMock.mockResolvedValue(1)
    insertLessonMock.mockResolvedValue(newLesson)
    insertTopicMock.mockResolvedValue(newTopic)
    listTopicsAndLessonsMock.mockResolvedValue([topic])
  })

  it('requires authentication', async () => {
    const response = await request(app).get(`/api/courses/${courseId}`)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('AUTH_REQUIRED')
  })

  it('rejects student accounts', async () => {
    findProfileByIdMock.mockResolvedValue(studentProfile)
    const token = await signTestToken()

    const response = await request(app)
      .get(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })

  it('returns the subject outline', async () => {
    const token = await signTestToken()

    const response = await request(app)
      .get(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { ...course, topics: [topic] },
      error: null,
    })
    expect(listTopicsAndLessonsMock).toHaveBeenCalledWith(courseId)
  })

  it('returns 404 when the subject is not owned', async () => {
    findCourseForInstructorMock.mockResolvedValue(null)
    const token = await signTestToken()

    const response = await request(app)
      .get(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('COURSE_NOT_FOUND')
  })

  it('creates a topic', async () => {
    const token = await signTestToken()

    const response = await request(app)
      .post(`/api/courses/${courseId}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'JavaScript' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: newTopic, error: null })
    expect(insertTopicMock).toHaveBeenCalledWith(courseId, 'JavaScript', 1)
  })

  it('validates topic input', async () => {
    const token = await signTestToken()

    const response = await request(app)
      .post(`/api/courses/${courseId}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '' })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(insertTopicMock).not.toHaveBeenCalled()
  })

  it('creates a lesson under a topic', async () => {
    const token = await signTestToken()

    const response = await request(app)
      .post(`/api/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ topicId, title: 'Flexbox' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ data: newLesson, error: null })
    expect(insertLessonMock).toHaveBeenCalledWith(
      courseId,
      topicId,
      'Flexbox',
      1,
    )
  })

  it('returns 404 when the lesson topic is not in the subject', async () => {
    findTopicForCourseMock.mockResolvedValue(null)
    const token = await signTestToken()

    const response = await request(app)
      .post(`/api/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ topicId, title: 'Flexbox' })

    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('TOPIC_NOT_FOUND')
    expect(insertLessonMock).not.toHaveBeenCalled()
  })
})

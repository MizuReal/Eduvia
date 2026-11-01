import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { signTestToken } from '../src/test/authToken.js'

const {
  findCourseForInstructorMock,
  findDeletedLessonForInstructorMock,
  findDeletedTopicForInstructorMock,
  findLessonForInstructorMock,
  findProfileByIdMock,
  findTopicForCourseMock,
  findTopicForInstructorMock,
  getCourseTrashMock,
  listTopicsAndLessonsMock,
  reorderCourseTopicsMock,
  reorderTopicLessonsMock,
  restoreLessonMock,
  restoreTopicMock,
  softDeleteLessonMock,
  softDeleteTopicMock,
  updateLessonRecordMock,
  updateTopicTitleMock,
} = vi.hoisted(() => ({
  findCourseForInstructorMock: vi.fn(),
  findDeletedLessonForInstructorMock: vi.fn(),
  findDeletedTopicForInstructorMock: vi.fn(),
  findLessonForInstructorMock: vi.fn(),
  findProfileByIdMock: vi.fn(),
  findTopicForCourseMock: vi.fn(),
  findTopicForInstructorMock: vi.fn(),
  getCourseTrashMock: vi.fn(),
  listTopicsAndLessonsMock: vi.fn(),
  reorderCourseTopicsMock: vi.fn(),
  reorderTopicLessonsMock: vi.fn(),
  restoreLessonMock: vi.fn(),
  restoreTopicMock: vi.fn(),
  softDeleteLessonMock: vi.fn(),
  softDeleteTopicMock: vi.fn(),
  updateLessonRecordMock: vi.fn(),
  updateTopicTitleMock: vi.fn(),
}))

vi.mock('../src/db/courses.js', () => ({
  findCourseForInstructor: findCourseForInstructorMock,
  insertCourse: vi.fn(),
  listCourseCodesForScope: vi.fn(),
  listCoursesByInstructor: vi.fn(),
}))

vi.mock('../src/db/courseOutline.js', () => ({
  findDeletedLessonForInstructor: findDeletedLessonForInstructorMock,
  findDeletedTopicForInstructor: findDeletedTopicForInstructorMock,
  findLessonForInstructor: findLessonForInstructorMock,
  findTopicForCourse: findTopicForCourseMock,
  findTopicForInstructor: findTopicForInstructorMock,
  getCourseTrash: getCourseTrashMock,
  getNextLessonOrderIndex: vi.fn(),
  getNextTopicOrderIndex: vi.fn(),
  insertLesson: vi.fn(),
  insertTopic: vi.fn(),
  listTopicsAndLessons: listTopicsAndLessonsMock,
  reorderCourseTopics: reorderCourseTopicsMock,
  reorderTopicLessons: reorderTopicLessonsMock,
  restoreLesson: restoreLessonMock,
  restoreTopic: restoreTopicMock,
  softDeleteLesson: softDeleteLessonMock,
  softDeleteTopic: softDeleteTopicMock,
  updateLessonRecord: updateLessonRecordMock,
  updateTopicTitle: updateTopicTitleMock,
}))

vi.mock('../src/db/profiles.js', () => ({
  createProfile: vi.fn(),
  findProfileById: findProfileByIdMock,
  findProfileByUsername: vi.fn(),
}))

const app = createApp()

const courseId = 'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8'
const topicId = '11111111-1111-4111-8111-111111111111'
const topic2Id = '22222222-2222-4222-8222-222222222222'
const lessonId = '33333333-3333-4333-8333-333333333333'
const lesson2Id = '44444444-4444-4444-8444-444444444444'

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

const timestamp = '2026-11-02T00:00:00.000Z'

const course = {
  id: courseId,
  name: 'ITPE2',
  code: 'IT-ITPE2',
  term: 'first_trimester',
  yearLevel: 3,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const lesson = {
  id: lessonId,
  topicId,
  title: 'Semantic HTML',
  orderIndex: 0,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const lesson2 = {
  id: lesson2Id,
  topicId,
  title: 'CSS Layout',
  orderIndex: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const topicSummary = {
  id: topicId,
  title: 'HTML and CSS',
  orderIndex: 0,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const topic1 = {
  ...topicSummary,
  lessons: [lesson, lesson2],
}

const topic2 = {
  id: topic2Id,
  title: 'JavaScript',
  orderIndex: 1,
  lessons: [],
  createdAt: timestamp,
  updatedAt: timestamp,
}

const outlineTopics = [topic1, topic2]

describe('course outline management API', () => {
  beforeEach(() => {
    findCourseForInstructorMock.mockReset()
    findDeletedLessonForInstructorMock.mockReset()
    findDeletedTopicForInstructorMock.mockReset()
    findLessonForInstructorMock.mockReset()
    findProfileByIdMock.mockReset()
    findTopicForCourseMock.mockReset()
    findTopicForInstructorMock.mockReset()
    getCourseTrashMock.mockReset()
    listTopicsAndLessonsMock.mockReset()
    reorderCourseTopicsMock.mockReset()
    reorderTopicLessonsMock.mockReset()
    restoreLessonMock.mockReset()
    restoreTopicMock.mockReset()
    softDeleteLessonMock.mockReset()
    softDeleteTopicMock.mockReset()
    updateLessonRecordMock.mockReset()
    updateTopicTitleMock.mockReset()

    findProfileByIdMock.mockResolvedValue(instructorProfile)
    findCourseForInstructorMock.mockResolvedValue(course)
    findTopicForInstructorMock.mockResolvedValue({
      id: topicId,
      course_id: courseId,
      title: 'HTML and CSS',
      order_index: 0,
      created_at: timestamp,
      updated_at: timestamp,
    })
    findLessonForInstructorMock.mockResolvedValue({
      id: lessonId,
      course_id: courseId,
      topic_id: topicId,
      title: 'Semantic HTML',
      order_index: 0,
      created_at: timestamp,
      updated_at: timestamp,
    })
    findTopicForCourseMock.mockResolvedValue({ id: topicId })
    listTopicsAndLessonsMock.mockResolvedValue(outlineTopics)
    updateTopicTitleMock.mockResolvedValue(topicSummary)
    updateLessonRecordMock.mockResolvedValue(lesson)
    softDeleteTopicMock.mockResolvedValue(undefined)
    softDeleteLessonMock.mockResolvedValue(undefined)
    reorderCourseTopicsMock.mockResolvedValue(undefined)
    reorderTopicLessonsMock.mockResolvedValue(undefined)
    restoreTopicMock.mockResolvedValue(topic1)
    restoreLessonMock.mockResolvedValue(lesson)
    getCourseTrashMock.mockResolvedValue({
      topics: [
        {
          id: topic2Id,
          title: 'JavaScript',
          deletedAt: timestamp,
          lessonCount: 0,
        },
      ],
      lessons: [
        {
          id: lesson2Id,
          title: 'CSS Layout',
          topicId,
          topicTitle: 'HTML and CSS',
          deletedAt: timestamp,
          restorable: true,
        },
      ],
    })
  })

  it('requires authentication', async () => {
    const response = await request(app).patch(`/api/topics/${topicId}`).send({
      title: 'Updated',
    })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('AUTH_REQUIRED')
  })

  it('rejects student accounts', async () => {
    findProfileByIdMock.mockResolvedValue(studentProfile)
    const token = await signTestToken()

    const response = await request(app)
      .patch(`/api/topics/${topicId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated' })

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe('FORBIDDEN')
  })

  it('updates a topic title', async () => {
    const token = await signTestToken()

    const response = await request(app)
      .patch(`/api/topics/${topicId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated topic' })

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(topicSummary)
    expect(updateTopicTitleMock).toHaveBeenCalledWith(topicId, 'Updated topic')
  })

  it('soft-deletes a topic', async () => {
    const token = await signTestToken()

    const response = await request(app)
      .delete(`/api/topics/${topicId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: { id: topicId }, error: null })
    expect(softDeleteTopicMock).toHaveBeenCalledWith(topicId)
  })

  it('updates a lesson title and moves it to another topic', async () => {
    const token = await signTestToken()

    const response = await request(app)
      .patch(`/api/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated lesson', topicId: topic2Id })

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(lesson)
    expect(findTopicForCourseMock).toHaveBeenCalledWith(courseId, topic2Id)
    expect(updateLessonRecordMock).toHaveBeenCalledWith(lessonId, {
      title: 'Updated lesson',
      topicId: topic2Id,
    })
  })

  it('soft-deletes a lesson', async () => {
    const token = await signTestToken()

    const response = await request(app)
      .delete(`/api/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ data: { id: lessonId }, error: null })
    expect(softDeleteLessonMock).toHaveBeenCalledWith(lessonId)
  })

  it('reorders topics', async () => {
    const token = await signTestToken()

    const response = await request(app)
      .patch(`/api/courses/${courseId}/topics/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ topicIds: [topic2Id, topicId] })

    expect(response.status).toBe(200)
    expect(reorderCourseTopicsMock).toHaveBeenCalledWith(courseId, [
      topic2Id,
      topicId,
    ])
  })

  it('rejects an incomplete topic order', async () => {
    const token = await signTestToken()

    const response = await request(app)
      .patch(`/api/courses/${courseId}/topics/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ topicIds: [topicId] })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_ORDER')
    expect(reorderCourseTopicsMock).not.toHaveBeenCalled()
  })

  it('reorders lessons within a topic', async () => {
    const token = await signTestToken()

    const response = await request(app)
      .patch(`/api/topics/${topicId}/lessons/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ lessonIds: [lesson2Id, lessonId] })

    expect(response.status).toBe(200)
    expect(reorderTopicLessonsMock).toHaveBeenCalledWith(topicId, [
      lesson2Id,
      lessonId,
    ])
  })

  it('returns deleted items', async () => {
    const token = await signTestToken()

    const response = await request(app)
      .get(`/api/courses/${courseId}/trash`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.data.topics).toHaveLength(1)
    expect(response.body.data.lessons).toHaveLength(1)
  })

  it('restores a topic', async () => {
    findDeletedTopicForInstructorMock.mockResolvedValue({
      id: topic2Id,
      course_id: courseId,
      title: 'JavaScript',
      deleted_at: timestamp,
    })
    const token = await signTestToken()

    const response = await request(app)
      .post(`/api/topics/${topic2Id}/restore`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(topic1)
    expect(restoreTopicMock).toHaveBeenCalledWith(topic2Id)
  })

  it('restores a lesson when its topic is active', async () => {
    findDeletedLessonForInstructorMock.mockResolvedValue({
      id: lesson2Id,
      course_id: courseId,
      topic_id: topicId,
      title: 'CSS Layout',
      deleted_at: timestamp,
    })
    const token = await signTestToken()

    const response = await request(app)
      .post(`/api/lessons/${lesson2Id}/restore`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(lesson)
    expect(restoreLessonMock).toHaveBeenCalledWith(lesson2Id)
  })

  it('rejects lesson restore while the parent topic is deleted', async () => {
    findDeletedLessonForInstructorMock.mockResolvedValue({
      id: lesson2Id,
      course_id: courseId,
      topic_id: topicId,
      title: 'CSS Layout',
      deleted_at: timestamp,
    })
    findTopicForCourseMock.mockResolvedValue(null)
    const token = await signTestToken()

    const response = await request(app)
      .post(`/api/lessons/${lesson2Id}/restore`)
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('TOPIC_DELETED')
    expect(restoreLessonMock).not.toHaveBeenCalled()
  })
})

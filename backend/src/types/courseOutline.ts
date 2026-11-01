import type { Course } from './course.js'

export type Lesson = {
  id: string
  topicId: string
  title: string
  orderIndex: number
  createdAt: string
  updatedAt: string
}

export type CourseTopic = {
  id: string
  title: string
  orderIndex: number
  lessons: Lesson[]
  createdAt: string
  updatedAt: string
}

export type CourseOutline = Course & {
  topics: CourseTopic[]
}

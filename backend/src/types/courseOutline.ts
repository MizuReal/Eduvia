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

export type CourseTopicSummary = Omit<CourseTopic, 'lessons'>

export type CourseOutline = Course & {
  topics: CourseTopic[]
}

export type DeletedTopic = {
  id: string
  title: string
  deletedAt: string
  lessonCount: number
}

export type DeletedLesson = {
  id: string
  title: string
  topicId: string
  topicTitle: string
  deletedAt: string
  restorable: boolean
}

export type CourseTrash = {
  topics: DeletedTopic[]
  lessons: DeletedLesson[]
}

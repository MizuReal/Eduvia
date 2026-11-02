import type { Faculty } from './auth.js'
import type { Course } from './course.js'
import type { QuizMode } from './quiz.js'

export type QuizResultStatus = 'passed' | 'failed' | 'not_taken'

export type TopicQuizSummary = {
  id: string
  title: string
  mode: QuizMode
  status: 'draft' | 'published'
  version: number
  passingScore: number
}

export type TopicQuizResultRow = {
  studentId: string
  username: string
  firstName: string
  lastName: string
  faculty: Faculty
  attempts: number
  bestScore: number | null
  maxScore: number | null
  percentage: number | null
  status: QuizResultStatus
  lastSubmittedAt: string | null
}

export type TopicQuizResults = {
  topic: {
    id: string
    title: string
  }
  quiz: TopicQuizSummary | null
  rows: TopicQuizResultRow[]
}

export type StudentQuizResultRow = {
  topicId: string
  topicTitle: string
  topicOrderIndex: number
  quizId: string
  quizTitle: string
  quizMode: QuizMode
  passingScore: number
  attempts: number
  bestScore: number | null
  maxScore: number | null
  percentage: number | null
  status: QuizResultStatus
  lastSubmittedAt: string | null
}

export type StudentQuizResults = {
  course: Course
  student: {
    id: string
    username: string
    faculty: Faculty
  }
  rows: StudentQuizResultRow[]
}

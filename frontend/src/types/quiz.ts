import type { TopicFile } from './topicContent'

export type QuizMode = 'native' | 'document'
export type QuizStatus = 'draft' | 'published'
export type CorrectOption = 'A' | 'B' | 'C' | 'D'

export type QuizQuestion = {
  id: string
  orderIndex: number
  prompt: string | null
  optionA: string | null
  optionB: string | null
  optionC: string | null
  optionD: string | null
  correctOption: CorrectOption
  explanation: string | null
  points: number
}

export type QuizFile = TopicFile & {
  previewHtml: string | null
}

export type Quiz = {
  id: string
  courseId: string
  topicId: string
  mode: QuizMode
  title: string
  instructions: string
  passingScore: number
  status: QuizStatus
  version: number
  file: QuizFile | null
  questions: QuizQuestion[]
  createdAt: string
  updatedAt: string
}

export type QuizWorkspace = {
  topic: {
    id: string
    title: string
    courseId: string
  }
  quiz: Quiz | null
}

export type QuizPreviewResult = {
  score: number
  maxScore: number
  percentage: number
  passed: boolean
  results: {
    questionId: string
    orderIndex: number
    selectedOption: CorrectOption
    correctOption: CorrectOption
    isCorrect: boolean
  }[]
}

export type NativeQuestionInput = {
  prompt: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctOption: CorrectOption
  explanation?: string | null
}

export type SaveQuizInput = {
  title: string
  instructions: string
  passingScore: number
  questions?: NativeQuestionInput[]
  answers?: CorrectOption[]
}

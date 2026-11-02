import type { CourseOutline, CourseTopic } from './courseOutline.js'
import type { CorrectOption, QuizMode } from './quiz.js'
import type { StudentTopicMaterials } from './topicContent.js'

export type SlideSource = 'upload' | 'slides'

export type TopicLearningStatus =
  | 'locked'
  | 'not_started'
  | 'in_progress'
  | 'ready'
  | 'not_passed'
  | 'passed'
  | 'completed'

export type TopicProgress = {
  presentationHighestSlideIndex: number
  slidesHighestSlideIndex: number
  presentationCompleted: boolean
  slidesCompleted: boolean
  completed: boolean
}

export type StudentQuizSummary = {
  id: string
  title: string
  mode: QuizMode
  questionCount: number
  passingScore: number
}

export type StudentSubjectTopic = CourseTopic & {
  status: TopicLearningStatus
  locked: boolean
  progress: TopicProgress
  quiz: StudentQuizSummary | null
}

export type StudentSubjectWorkspace = Omit<CourseOutline, 'topics'> & {
  instructorUsername: string
  progress: {
    completedTopics: number
    totalTopics: number
    percent: number
  }
  topics: StudentSubjectTopic[]
}

export type StudentTopicContent = StudentTopicMaterials & {
  progress: TopicProgress
  quiz: StudentQuizSummary | null
  status: TopicLearningStatus
  latestAttempt: {
    percentage: number
    passed: boolean
    gradedAt: string | null
  } | null
  locked: boolean
  nextTopicId: string | null
}

export type StudentQuizFile = {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  fileClass: 'image' | 'document'
  width: number | null
  height: number | null
  status: 'uploading' | 'processing' | 'ready' | 'failed' | 'quarantined'
  previewHtml: string | null
  url: string
  expiresAt: string
}

export type AttemptQuestion = {
  id: string
  orderIndex: number
  prompt: string | null
  optionA: string | null
  optionB: string | null
  optionC: string | null
  optionD: string | null
  points: number
}

export type AttemptSnapshotQuestion = AttemptQuestion & {
  correctOption: CorrectOption
  explanation: string | null
}

export type AttemptSnapshot = {
  quizId: string
  version: number
  mode: QuizMode
  title: string
  instructions: string
  passingScore: number
  fileId: string | null
  questions: AttemptSnapshotQuestion[]
}

export type AttemptAnswer = {
  questionId: string
  selectedOption: CorrectOption
}

export type AttemptResultAnswer = AttemptAnswer & {
  correctOption: CorrectOption | null
  isCorrect: boolean
  pointsAwarded: number
}

export type AttemptResult = {
  score: number
  maxScore: number
  percentage: number
  passed: boolean
  answers: AttemptResultAnswer[]
}

export type StudentAttemptWorkspace = {
  id: string
  quizId: string
  topicId: string
  attemptNumber: number
  status: 'in_progress' | 'graded'
  quiz: {
    title: string
    instructions: string
    passingScore: number
    mode: QuizMode
  }
  questions: AttemptQuestion[]
  answers: AttemptAnswer[]
  paper: StudentQuizFile | null
  result: AttemptResult | null
}

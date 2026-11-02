import type { QuizResultStatus } from '../../types/quizResults'

export const RESULT_STATUS_LABELS: Record<QuizResultStatus, string> = {
  passed: 'Passed',
  failed: 'Failed',
  not_taken: 'Not taken',
}

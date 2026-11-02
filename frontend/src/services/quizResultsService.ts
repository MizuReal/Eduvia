import type { StudentQuizResults, TopicQuizResults } from '../types/quizResults'
import { get } from './apiClient'

export function getTopicQuizResults(
  topicId: string,
  accessToken: string,
): Promise<TopicQuizResults> {
  return get<TopicQuizResults>(
    `/api/topics/${topicId}/quiz/results`,
    accessToken,
  )
}

export function getStudentQuizResults(
  courseId: string,
  studentId: string,
  accessToken: string,
): Promise<StudentQuizResults> {
  return get<StudentQuizResults>(
    `/api/courses/${courseId}/students/${studentId}/quiz-results`,
    accessToken,
  )
}

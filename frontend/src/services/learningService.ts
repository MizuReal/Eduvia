import type {
  AttemptAnswer,
  SlideSource,
  StudentAttemptWorkspace,
  TopicProgress,
} from '../types/learning'
import { get, patchAuth, postAuth } from './apiClient'

export function recordSlideProgress(
  topicId: string,
  source: SlideSource,
  slideIndex: number,
  accessToken: string,
): Promise<TopicProgress> {
  return patchAuth<TopicProgress>(
    `/api/student/topics/${topicId}/progress`,
    { source, slideIndex },
    accessToken,
  )
}

export function startQuizAttempt(
  quizId: string,
  accessToken: string,
): Promise<StudentAttemptWorkspace> {
  return postAuth<StudentAttemptWorkspace>(
    `/api/quizzes/${quizId}/attempts`,
    {},
    accessToken,
  )
}

export function getStudentAttempt(
  attemptId: string,
  accessToken: string,
): Promise<StudentAttemptWorkspace> {
  return get<StudentAttemptWorkspace>(
    `/api/attempts/${attemptId}`,
    accessToken,
  )
}

export function saveAttemptAnswers(
  attemptId: string,
  answers: AttemptAnswer[],
  accessToken: string,
): Promise<StudentAttemptWorkspace> {
  return patchAuth<StudentAttemptWorkspace>(
    `/api/attempts/${attemptId}/answers`,
    { answers },
    accessToken,
  )
}

export function submitAttempt(
  attemptId: string,
  accessToken: string,
): Promise<StudentAttemptWorkspace> {
  return postAuth<StudentAttemptWorkspace>(
    `/api/attempts/${attemptId}/submit`,
    {},
    accessToken,
  )
}

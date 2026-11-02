import type {
  CorrectOption,
  Quiz,
  QuizMode,
  QuizPreviewResult,
  QuizWorkspace,
  SaveQuizInput,
} from '../types/quiz'
import { deleteAuth, get, postAuth, putAuth } from './apiClient'
import { uploadMultipart } from './uploadRequest'
import type { UploadRequestOptions } from './uploadRequest'

export function getQuizWorkspace(
  topicId: string,
  accessToken: string,
): Promise<QuizWorkspace> {
  return get<QuizWorkspace>(`/api/topics/${topicId}/quiz`, accessToken)
}

export function ensureQuiz(
  topicId: string,
  mode: QuizMode,
  accessToken: string,
): Promise<Quiz> {
  return putAuth<Quiz>(
    `/api/topics/${topicId}/quiz`,
    { mode },
    accessToken,
  )
}

export function getQuiz(
  quizId: string,
  accessToken: string,
): Promise<Quiz> {
  return get<Quiz>(`/api/quizzes/${quizId}`, accessToken)
}

export function saveQuiz(
  quizId: string,
  input: SaveQuizInput,
  accessToken: string,
): Promise<Quiz> {
  return putAuth<Quiz>(`/api/quizzes/${quizId}`, input, accessToken)
}

export function publishQuiz(
  quizId: string,
  accessToken: string,
): Promise<Quiz> {
  return postAuth<Quiz>(`/api/quizzes/${quizId}/publish`, {}, accessToken)
}

export function uploadQuizPaper(
  quizId: string,
  file: File,
  accessToken: string,
  options: UploadRequestOptions = {},
): Promise<Quiz> {
  const formData = new FormData()
  formData.set('file', file)

  return uploadMultipart<Quiz>(
    `/api/quizzes/${quizId}/paper`,
    formData,
    accessToken,
    options,
  )
}

export function removeQuizPaper(
  quizId: string,
  accessToken: string,
): Promise<Quiz> {
  return deleteAuth<Quiz>(
    `/api/quizzes/${quizId}/paper`,
    accessToken,
  )
}

export async function deleteQuiz(
  quizId: string,
  accessToken: string,
): Promise<void> {
  await deleteAuth<{ id: string }>(`/api/quizzes/${quizId}`, accessToken)
}

export function previewGrade(
  quizId: string,
  answers: CorrectOption[],
  accessToken: string,
): Promise<QuizPreviewResult> {
  return postAuth<QuizPreviewResult>(
    `/api/quizzes/${quizId}/preview-grade`,
    { answers },
    accessToken,
  )
}

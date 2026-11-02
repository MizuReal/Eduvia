import { randomUUID } from 'node:crypto'
import {
  COURSE_FILES_BUCKET,
  DOCX_MIME_TYPE,
  MAX_QUIZ_QUESTIONS,
  MIN_QUIZ_QUESTIONS,
} from '../config/constants.js'
import { findTopicForInstructor } from '../db/courseOutline.js'
import {
  findFileForQuiz,
  findQuizByTopic,
  findQuizForInstructor,
  getQuizById,
  insertQuiz,
  listQuizQuestions,
  publishQuizRecord,
  removeQuizPaperRecord,
  replaceQuizPaperRecord,
  saveQuizRecord,
  softDeleteQuizRecord,
  toQuiz,
} from '../db/quizzes.js'
import type {
  QuizQuestionSelectRow,
  QuizSelectRow,
  SaveQuizQuestionRecord,
} from '../db/quizzes.js'
import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import type {
  CreateQuizInput,
  PreviewGradeInput,
  SaveQuizInput,
} from '../schemas/quiz.js'
import { convertDocxToPreview } from './docxPreviewService.js'
import { assertStorageQuota } from './storageQuotaService.js'
import {
  removeCourseFile,
  uploadCourseFile,
} from '../storage/courseFiles.js'
import type { AuthenticatedUser } from '../types/auth.js'
import type {
  CorrectOption,
  Quiz,
  QuizPreviewResult,
  QuizWorkspace,
} from '../types/quiz.js'
import {
  buildStoragePath,
  removeTempUpload,
  sanitizeOriginalFilename,
} from '../utils/files.js'
import { validateUploadedFile } from './uploadService.js'

function questionRecordsFromAnswers(answers: CorrectOption[]) {
  return answers.map((answer) => ({
    prompt: null,
    optionA: null,
    optionB: null,
    optionC: null,
    optionD: null,
    correctOption: answer,
    explanation: null,
  }))
}

async function buildQuiz(row: QuizSelectRow): Promise<Quiz> {
  const [fileRow, questions] = await Promise.all([
    findFileForQuiz(row.file_id),
    listQuizQuestions(row.id),
  ])

  return toQuiz(row, fileRow, questions)
}

async function requireQuiz(
  user: AuthenticatedUser,
  quizId: string,
): Promise<QuizSelectRow> {
  const quiz = await findQuizForInstructor(quizId, user.id)

  if (!quiz) {
    throw new AppError(404, 'QUIZ_NOT_FOUND', 'Quiz not found.')
  }

  return quiz
}

async function reloadQuiz(quizId: string): Promise<Quiz> {
  const row = await getQuizById(quizId)

  if (!row) {
    throw new AppError(404, 'QUIZ_NOT_FOUND', 'Quiz not found.')
  }

  return buildQuiz(row)
}

export async function getQuizWorkspace(
  user: AuthenticatedUser,
  topicId: string,
): Promise<QuizWorkspace> {
  const topic = await findTopicForInstructor(topicId, user.id)

  if (!topic) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  const quizRow = await findQuizByTopic(topicId)

  return {
    topic: {
      id: topic.id,
      title: topic.title,
      courseId: topic.course_id,
    },
    quiz: quizRow ? await buildQuiz(quizRow) : null,
  }
}

export async function ensureQuiz(
  user: AuthenticatedUser,
  topicId: string,
  input: CreateQuizInput,
): Promise<Quiz> {
  const topic = await findTopicForInstructor(topicId, user.id)

  if (!topic) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  const existing = await findQuizByTopic(topicId)

  if (existing) {
    if (existing.mode !== input.mode) {
      throw new AppError(
        409,
        'QUIZ_MODE_LOCKED',
        'Delete the current quiz before changing its type.',
      )
    }

    return buildQuiz(existing)
  }

  try {
    const created = await insertQuiz(topic.course_id, topicId, input.mode)
    return buildQuiz(created)
  } catch (error) {
    const raced = await findQuizByTopic(topicId)

    if (raced) {
      if (raced.mode !== input.mode) {
        throw new AppError(
          409,
          'QUIZ_MODE_LOCKED',
          'Delete the current quiz before changing its type.',
        )
      }

      return buildQuiz(raced)
    }

    throw error
  }
}

export async function getQuiz(
  user: AuthenticatedUser,
  quizId: string,
): Promise<Quiz> {
  const quiz = await requireQuiz(user, quizId)
  return buildQuiz(quiz)
}

export async function saveQuiz(
  user: AuthenticatedUser,
  quizId: string,
  input: SaveQuizInput,
): Promise<Quiz> {
  const quiz = await requireQuiz(user, quizId)

  let questions: SaveQuizQuestionRecord[]

  if (quiz.mode === 'native') {
    if (input.answers !== undefined) {
      throw new AppError(
        400,
        'QUIZ_MODE_MISMATCH',
        'This quiz uses in-app questions, not an answer key.',
      )
    }

    if (input.questions === undefined) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Provide quiz questions.',
      )
    }

    questions = input.questions.map((question) => ({
      prompt: question.prompt,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctOption: question.correctOption,
      explanation:
        question.explanation && question.explanation.length > 0
          ? question.explanation
          : null,
    }))
  } else {
    if (input.questions !== undefined) {
      throw new AppError(
        400,
        'QUIZ_MODE_MISMATCH',
        'This quiz uses an uploaded paper and answer key.',
      )
    }

    if (input.answers === undefined) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Provide the quiz answer key.',
      )
    }

    questions = questionRecordsFromAnswers(input.answers)
  }

  await saveQuizRecord(
    quizId,
    input.title,
    input.instructions,
    input.passingScore,
    questions,
  )

  return reloadQuiz(quizId)
}

function assertPublishable(
  quiz: QuizSelectRow,
  questions: QuizQuestionSelectRow[],
  hasFile: boolean,
): void {
  if (
    questions.length < MIN_QUIZ_QUESTIONS ||
    questions.length > MAX_QUIZ_QUESTIONS
  ) {
    throw new AppError(
      400,
      'QUIZ_NOT_READY',
      `A quiz must have between ${MIN_QUIZ_QUESTIONS} and ${MAX_QUIZ_QUESTIONS} questions to publish.`,
    )
  }

  if (quiz.mode === 'document') {
    if (!hasFile) {
      throw new AppError(
        400,
        'QUIZ_NOT_READY',
        'Upload the quiz paper before publishing.',
      )
    }

    return
  }

  for (const question of questions) {
    if (
      !question.prompt ||
      !question.option_a ||
      !question.option_b ||
      !question.option_c ||
      !question.option_d
    ) {
      throw new AppError(
        400,
        'QUIZ_NOT_READY',
        'Every question needs a prompt and four options before publishing.',
      )
    }
  }
}

export async function publishQuiz(
  user: AuthenticatedUser,
  quizId: string,
): Promise<Quiz> {
  const quiz = await requireQuiz(user, quizId)
  const [questions, fileRow] = await Promise.all([
    listQuizQuestions(quizId),
    findFileForQuiz(quiz.file_id),
  ])

  assertPublishable(quiz, questions, fileRow !== null)

  const published = await publishQuizRecord(quizId, user.id)
  return buildQuiz(published)
}

export async function uploadQuizPaper(
  user: AuthenticatedUser,
  quizId: string,
  file: Express.Multer.File,
): Promise<Quiz> {
  try {
    const quiz = await requireQuiz(user, quizId)

    if (quiz.mode !== 'document') {
      throw new AppError(
        400,
        'QUIZ_MODE_MISMATCH',
        'Only uploaded-paper quizzes accept a quiz paper.',
      )
    }

    const validated = await validateUploadedFile(file, 'quiz-paper')
    const previewHtml =
      validated.mimeType === DOCX_MIME_TYPE
        ? await convertDocxToPreview(validated.buffer)
        : null

    await assertStorageQuota(user.id, validated.sizeBytes)

    const fileId = randomUUID()
    const originalName = sanitizeOriginalFilename(file.originalname)
    const storagePath = buildStoragePath(quiz.course_id, fileId, originalName)

    await uploadCourseFile(storagePath, validated.buffer, validated.mimeType)

    try {
      await replaceQuizPaperRecord({
        quizId,
        courseId: quiz.course_id,
        topicId: quiz.topic_id,
        uploadedBy: user.id,
        bucket: COURSE_FILES_BUCKET,
        storagePath,
        originalName,
        mimeType: validated.mimeType,
        sizeBytes: validated.sizeBytes,
        checksumSha256: validated.checksumSha256,
        previewHtml,
        actorId: user.id,
      })
    } catch (error) {
      try {
        await removeCourseFile(storagePath)
      } catch (cleanupError) {
        logger.error(
          { err: cleanupError, storagePath },
          'Quiz paper storage cleanup failed',
        )
      }

      throw error
    }

    return reloadQuiz(quizId)
  } finally {
    await removeTempUpload(file.path)
  }
}

export async function removeQuizPaper(
  user: AuthenticatedUser,
  quizId: string,
): Promise<Quiz> {
  const quiz = await requireQuiz(user, quizId)

  if (quiz.mode !== 'document') {
    throw new AppError(
      400,
      'QUIZ_MODE_MISMATCH',
      'Only uploaded-paper quizzes have a paper.',
    )
  }

  await removeQuizPaperRecord(quizId, user.id)
  return reloadQuiz(quizId)
}

export async function deleteQuiz(
  user: AuthenticatedUser,
  quizId: string,
): Promise<void> {
  await requireQuiz(user, quizId)
  await softDeleteQuizRecord(quizId, user.id)
}

export async function previewGradeQuiz(
  user: AuthenticatedUser,
  quizId: string,
  input: PreviewGradeInput,
): Promise<QuizPreviewResult> {
  const quiz = await requireQuiz(user, quizId)
  const questions = await listQuizQuestions(quizId)

  if (questions.length === 0) {
    throw new AppError(400, 'QUIZ_EMPTY', 'This quiz has no questions.')
  }

  if (input.answers.length !== questions.length) {
    throw new AppError(
      400,
      'QUIZ_ANSWER_COUNT_MISMATCH',
      'Answer every question before submitting.',
    )
  }

  let score = 0
  let maxScore = 0
  const results = questions.map((question, index) => {
    const selected = input.answers[index]

    if (!selected) {
      throw new AppError(
        400,
        'QUIZ_ANSWER_COUNT_MISMATCH',
        'Answer every question before submitting.',
      )
    }

    const isCorrect = selected === question.correct_option
    maxScore += question.points

    if (isCorrect) {
      score += question.points
    }

    return {
      questionId: question.id,
      orderIndex: question.order_index,
      selectedOption: selected,
      correctOption: question.correct_option,
      isCorrect,
    }
  })

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0

  return {
    score,
    maxScore,
    percentage,
    passed: percentage >= quiz.passing_score,
    results,
  }
}

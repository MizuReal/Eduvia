import { QUIZ_DEFAULT_PASSING_SCORE } from '../config/constants.js'
import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import { findCourseForInstructor } from './courses.js'
import type { FileRow, QuizQuestionRow, QuizRow } from './database.types.js'
import { supabaseAdmin } from './supabaseAdmin.js'
import { toTopicFile } from './topicContent.js'
import type { CorrectOption, Quiz, QuizFile, QuizQuestion } from '../types/quiz.js'

const QUIZ_COLUMNS =
  'id, course_id, topic_id, mode, title, instructions, passing_score, status, version, file_id, deleted_at, created_at, updated_at'

const QUESTION_COLUMNS =
  'id, quiz_id, order_index, prompt, option_a, option_b, option_c, option_d, correct_option, explanation, points, deleted_at, created_at, updated_at'

export type QuizSelectRow = Pick<
  QuizRow,
  | 'id'
  | 'course_id'
  | 'topic_id'
  | 'mode'
  | 'title'
  | 'instructions'
  | 'passing_score'
  | 'status'
  | 'version'
  | 'file_id'
  | 'deleted_at'
  | 'created_at'
  | 'updated_at'
>

export type QuizQuestionSelectRow = Pick<
  QuizQuestionRow,
  | 'id'
  | 'quiz_id'
  | 'order_index'
  | 'prompt'
  | 'option_a'
  | 'option_b'
  | 'option_c'
  | 'option_d'
  | 'correct_option'
  | 'explanation'
  | 'points'
  | 'deleted_at'
  | 'created_at'
  | 'updated_at'
>

export type SaveQuizQuestionRecord = {
  prompt: string | null
  optionA: string | null
  optionB: string | null
  optionC: string | null
  optionD: string | null
  correctOption: CorrectOption
  explanation: string | null
}

export type ReplaceQuizPaperRecordInput = {
  quizId: string
  courseId: string
  topicId: string
  uploadedBy: string
  bucket: string
  storagePath: string
  originalName: string
  mimeType: string
  sizeBytes: number
  checksumSha256: string
  previewHtml: string | null
  actorId: string
}

export function toQuizFile(row: FileRow): QuizFile {
  return {
    ...toTopicFile(row),
    previewHtml: row.preview_html,
  }
}

function toQuestion(row: QuizQuestionSelectRow): QuizQuestion {
  return {
    id: row.id,
    orderIndex: row.order_index,
    prompt: row.prompt,
    optionA: row.option_a,
    optionB: row.option_b,
    optionC: row.option_c,
    optionD: row.option_d,
    correctOption: row.correct_option,
    explanation: row.explanation,
    points: row.points,
  }
}

export function toQuiz(
  row: QuizSelectRow,
  fileRow: FileRow | null,
  questionRows: QuizQuestionSelectRow[],
): Quiz {
  return {
    id: row.id,
    courseId: row.course_id,
    topicId: row.topic_id,
    mode: row.mode,
    title: row.title,
    instructions: row.instructions,
    passingScore: row.passing_score,
    status: row.status,
    version: row.version,
    file: fileRow ? toQuizFile(fileRow) : null,
    questions: questionRows.map(toQuestion),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

export async function getQuizById(
  quizId: string,
): Promise<QuizSelectRow | null> {
  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .select(QUIZ_COLUMNS)
    .eq('id', quizId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, quizId }, 'Quiz lookup failed')
    throw new AppError(
      503,
      'QUIZ_LOAD_FAILED',
      'We could not load this quiz. Try again.',
    )
  }

  return data ?? null
}

export async function findQuizForInstructor(
  quizId: string,
  instructorId: string,
): Promise<QuizSelectRow | null> {
  const quiz = await getQuizById(quizId)

  if (!quiz) {
    return null
  }

  const course = await findCourseForInstructor(quiz.course_id, instructorId)

  return course ? quiz : null
}

export async function findQuizByTopic(
  topicId: string,
): Promise<QuizSelectRow | null> {
  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .select(QUIZ_COLUMNS)
    .eq('topic_id', topicId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, topicId }, 'Topic quiz lookup failed')
    throw new AppError(
      503,
      'QUIZ_LOAD_FAILED',
      'We could not load this quiz. Try again.',
    )
  }

  return data ?? null
}

export async function listPublishedQuizzesForCourse(
  courseId: string,
): Promise<QuizSelectRow[]> {
  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .select(QUIZ_COLUMNS)
    .eq('course_id', courseId)
    .eq('status', 'published')
    .is('deleted_at', null)

  if (error) {
    logger.error({ err: error, courseId }, 'Published quiz list failed')
    throw new AppError(
      503,
      'QUIZ_LOAD_FAILED',
      'We could not load this subject’s quizzes. Try again.',
    )
  }

  return data ?? []
}

export async function insertQuiz(
  courseId: string,
  topicId: string,
  mode: 'native' | 'document',
): Promise<QuizSelectRow> {
  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .insert({
      course_id: courseId,
      topic_id: topicId,
      mode,
      title: 'Untitled quiz',
      instructions: '',
      passing_score: QUIZ_DEFAULT_PASSING_SCORE,
      status: 'draft',
      version: 1,
    })
    .select(QUIZ_COLUMNS)
    .single()

  if (error || !data) {
    logger.error({ err: error, topicId, mode }, 'Quiz creation failed')
    throw new AppError(
      500,
      'QUIZ_CREATE_FAILED',
      'We could not create this quiz. Try again.',
    )
  }

  return data
}

export async function listQuizQuestions(
  quizId: string,
): Promise<QuizQuestionSelectRow[]> {
  const { data, error } = await supabaseAdmin
    .from('quiz_questions')
    .select(QUESTION_COLUMNS)
    .eq('quiz_id', quizId)
    .is('deleted_at', null)
    .order('order_index', { ascending: true })

  if (error) {
    logger.error({ err: error, quizId }, 'Quiz questions load failed')
    throw new AppError(
      503,
      'QUIZ_LOAD_FAILED',
      'We could not load this quiz. Try again.',
    )
  }

  return data ?? []
}

export async function countQuizQuestionsByQuizIds(
  quizIds: string[],
): Promise<Map<string, number>> {
  if (quizIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabaseAdmin
    .from('quiz_questions')
    .select('quiz_id')
    .in('quiz_id', quizIds)
    .is('deleted_at', null)

  if (error) {
    logger.error({ err: error }, 'Quiz question counts failed')
    throw new AppError(
      503,
      'QUIZ_LOAD_FAILED',
      'We could not load these quizzes. Try again.',
    )
  }

  const counts = new Map<string, number>()

  for (const row of data ?? []) {
    counts.set(row.quiz_id, (counts.get(row.quiz_id) ?? 0) + 1)
  }

  return counts
}

export async function findFileForQuiz(
  fileId: string | null,
): Promise<FileRow | null> {
  if (!fileId) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('files')
    .select(
      'id, course_id, topic_id, uploaded_by, bucket, storage_path, original_name, mime_type, size_bytes, checksum_sha256, file_class, width, height, status, content_id, preview_html, deleted_at, created_at, updated_at',
    )
    .eq('id', fileId)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, fileId }, 'Quiz paper lookup failed')
    throw new AppError(
      503,
      'QUIZ_LOAD_FAILED',
      'We could not load this quiz paper. Try again.',
    )
  }

  return data ?? null
}

export async function saveQuizRecord(
  quizId: string,
  title: string,
  instructions: string,
  passingScore: number,
  questions: SaveQuizQuestionRecord[],
): Promise<void> {
  const payload = questions.map((question) => ({
    prompt: question.prompt,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    correctOption: question.correctOption,
    explanation: question.explanation,
  }))

  const { error } = await supabaseAdmin.rpc('save_quiz', {
    target_quiz_id: quizId,
    new_title: title,
    new_instructions: instructions,
    new_passing_score: passingScore,
    new_questions: payload,
  })

  if (error) {
    logger.error({ err: error, quizId }, 'Quiz save failed')
    throw new AppError(
      500,
      'QUIZ_SAVE_FAILED',
      'We could not save this quiz. Try again.',
    )
  }
}

export async function publishQuizRecord(
  quizId: string,
  actorId: string,
): Promise<QuizSelectRow> {
  const { data, error } = await supabaseAdmin.rpc('publish_quiz', {
    target_quiz_id: quizId,
    target_actor_id: actorId,
  })

  if (error || !data) {
    logger.error({ err: error, quizId }, 'Quiz publish failed')
    throw new AppError(
      500,
      'QUIZ_PUBLISH_FAILED',
      'We could not publish this quiz. Try again.',
    )
  }

  return data
}

export async function replaceQuizPaperRecord(
  input: ReplaceQuizPaperRecordInput,
): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('replace_quiz_paper', {
    target_quiz_id: input.quizId,
    target_course_id: input.courseId,
    target_topic_id: input.topicId,
    target_uploaded_by: input.uploadedBy,
    target_bucket: input.bucket,
    target_storage_path: input.storagePath,
    target_original_name: input.originalName,
    target_mime_type: input.mimeType,
    target_size_bytes: input.sizeBytes,
    target_checksum_sha256: input.checksumSha256,
    target_preview_html: input.previewHtml,
    target_actor_id: input.actorId,
  })

  if (error || !data) {
    logger.error({ err: error, quizId: input.quizId }, 'Quiz paper save failed')
    throw new AppError(
      500,
      'QUIZ_PAPER_SAVE_FAILED',
      'We could not save this quiz paper. Try again.',
    )
  }

  return data.fileId
}

export async function removeQuizPaperRecord(
  quizId: string,
  actorId: string,
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('remove_quiz_paper', {
    target_quiz_id: quizId,
    target_actor_id: actorId,
  })

  if (error) {
    logger.error({ err: error, quizId }, 'Quiz paper removal failed')
    throw new AppError(
      500,
      'QUIZ_PAPER_REMOVE_FAILED',
      'We could not remove this quiz paper. Try again.',
    )
  }
}

export async function softDeleteQuizRecord(
  quizId: string,
  actorId: string,
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('soft_delete_quiz', {
    target_quiz_id: quizId,
    target_actor_id: actorId,
  })

  if (error) {
    logger.error({ err: error, quizId }, 'Quiz delete failed')
    throw new AppError(
      500,
      'QUIZ_DELETE_FAILED',
      'We could not delete this quiz. Try again.',
    )
  }
}

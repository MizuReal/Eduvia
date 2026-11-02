import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import type { QuizAttemptRow, TopicProgressRow } from './database.types.js'
import type { CorrectOption } from '../types/quiz.js'
import type { AttemptAnswer, AttemptSnapshot } from '../types/learning.js'
import { supabaseAdmin } from './supabaseAdmin.js'

const PROGRESS_COLUMNS =
  'id, course_id, topic_id, student_id, presentation_highest_slide_index, slides_highest_slide_index, presentation_completed_at, slides_completed_at, created_at, updated_at'

const ATTEMPT_COLUMNS =
  'id, quiz_id, course_id, topic_id, student_id, attempt_number, status, snapshot, score, max_score, percentage, passed, started_at, submitted_at, graded_at, created_at, updated_at'
const ATTEMPT_SUMMARY_COLUMNS =
  'quiz_id, attempt_number, status, passed, percentage, graded_at'
const RESULT_ATTEMPT_COLUMNS =
  'id, quiz_id, course_id, topic_id, student_id, attempt_number, score, max_score, percentage, passed, submitted_at, graded_at'

const ANSWER_COLUMNS =
  'id, attempt_id, question_id, selected_option, is_correct, points_awarded, created_at, updated_at'

export type TopicProgressSelectRow = Pick<
  TopicProgressRow,
  | 'id'
  | 'course_id'
  | 'topic_id'
  | 'student_id'
  | 'presentation_highest_slide_index'
  | 'slides_highest_slide_index'
  | 'presentation_completed_at'
  | 'slides_completed_at'
  | 'created_at'
  | 'updated_at'
>

export type QuizAttemptSelectRow = Pick<
  QuizAttemptRow,
  | 'id'
  | 'quiz_id'
  | 'course_id'
  | 'topic_id'
  | 'student_id'
  | 'attempt_number'
  | 'status'
  | 'snapshot'
  | 'score'
  | 'max_score'
  | 'percentage'
  | 'passed'
  | 'started_at'
  | 'submitted_at'
  | 'graded_at'
  | 'created_at'
  | 'updated_at'
>

export type AttemptAnswerSelectRow = {
  id: string
  attempt_id: string
  question_id: string
  selected_option: CorrectOption
  is_correct: boolean | null
  points_awarded: number | null
  created_at: string
  updated_at: string
}

export type TopicProgressRecord = {
  id: string
  courseId: string
  topicId: string
  studentId: string
  presentationHighestSlideIndex: number
  slidesHighestSlideIndex: number
  presentationCompleted: boolean
  slidesCompleted: boolean
  createdAt: string
  updatedAt: string
}

export type QuizAttemptRecord = {
  id: string
  quizId: string
  courseId: string
  topicId: string
  studentId: string
  attemptNumber: number
  status: 'in_progress' | 'graded'
  snapshot: AttemptSnapshot
  score: number | null
  maxScore: number | null
  percentage: number | null
  passed: boolean | null
  startedAt: string
  submittedAt: string | null
  gradedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AttemptSummaryRecord = {
  quizId: string
  status: 'in_progress' | 'graded'
  passed: boolean | null
  percentage: number | null
  gradedAt: string | null
}

export type QuizResultAttemptRecord = {
  id: string
  quizId: string
  courseId: string
  topicId: string
  studentId: string
  attemptNumber: number
  score: number | null
  maxScore: number | null
  percentage: number | null
  passed: boolean | null
  submittedAt: string | null
  gradedAt: string | null
}

export type AttemptAnswerRecord = AttemptAnswer & {
  isCorrect: boolean | null
  pointsAwarded: number | null
}

function toProgress(row: TopicProgressSelectRow): TopicProgressRecord {
  return {
    id: row.id,
    courseId: row.course_id,
    topicId: row.topic_id,
    studentId: row.student_id,
    presentationHighestSlideIndex: row.presentation_highest_slide_index,
    slidesHighestSlideIndex: row.slides_highest_slide_index,
    presentationCompleted: row.presentation_completed_at !== null,
    slidesCompleted: row.slides_completed_at !== null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

function toAttempt(row: QuizAttemptSelectRow): QuizAttemptRecord {
  return {
    id: row.id,
    quizId: row.quiz_id,
    courseId: row.course_id,
    topicId: row.topic_id,
    studentId: row.student_id,
    attemptNumber: row.attempt_number,
    status: row.status,
    snapshot: row.snapshot as unknown as AttemptSnapshot,
    score: row.score,
    maxScore: row.max_score,
    percentage: row.percentage,
    passed: row.passed,
    startedAt: new Date(row.started_at).toISOString(),
    submittedAt: row.submitted_at
      ? new Date(row.submitted_at).toISOString()
      : null,
    gradedAt: row.graded_at ? new Date(row.graded_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

function toAnswer(row: AttemptAnswerSelectRow): AttemptAnswerRecord {
  return {
    questionId: row.question_id,
    selectedOption: row.selected_option,
    isCorrect: row.is_correct,
    pointsAwarded: row.points_awarded,
  }
}

function toResultAttempt(row: {
  id: string
  quiz_id: string
  course_id: string
  topic_id: string
  student_id: string
  attempt_number: number
  score: number | null
  max_score: number | null
  percentage: number | null
  passed: boolean | null
  submitted_at: string | null
  graded_at: string | null
}): QuizResultAttemptRecord {
  return {
    id: row.id,
    quizId: row.quiz_id,
    courseId: row.course_id,
    topicId: row.topic_id,
    studentId: row.student_id,
    attemptNumber: row.attempt_number,
    score: row.score,
    maxScore: row.max_score,
    percentage: row.percentage,
    passed: row.passed,
    submittedAt: row.submitted_at
      ? new Date(row.submitted_at).toISOString()
      : null,
    gradedAt: row.graded_at ? new Date(row.graded_at).toISOString() : null,
  }
}

export async function findTopicProgress(
  topicId: string,
  studentId: string,
): Promise<TopicProgressRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('topic_progress')
    .select(PROGRESS_COLUMNS)
    .eq('topic_id', topicId)
    .eq('student_id', studentId)
    .maybeSingle()

  if (error) {
    logger.error(
      { err: error, topicId, studentId },
      'Topic progress lookup failed',
    )
    throw new AppError(
      503,
      'PROGRESS_LOAD_FAILED',
      'We could not load your progress. Try again.',
    )
  }

  return data ? toProgress(data) : null
}

export async function listTopicProgressForCourse(
  courseId: string,
  studentId: string,
): Promise<TopicProgressRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('topic_progress')
    .select(PROGRESS_COLUMNS)
    .eq('course_id', courseId)
    .eq('student_id', studentId)

  if (error) {
    logger.error(
      { err: error, courseId, studentId },
      'Course progress load failed',
    )
    throw new AppError(
      503,
      'PROGRESS_LOAD_FAILED',
      'We could not load your progress. Try again.',
    )
  }

  return (data ?? []).map(toProgress)
}

export async function recordTopicSlideProgress(input: {
  courseId: string
  topicId: string
  studentId: string
  source: 'presentation' | 'slides'
  slideIndex: number
  slideCount: number
}): Promise<TopicProgressRecord> {
  const { data, error } = await supabaseAdmin.rpc(
    'record_topic_slide_progress',
    {
      target_course_id: input.courseId,
      target_topic_id: input.topicId,
      target_student_id: input.studentId,
      target_source: input.source,
      target_slide_index: input.slideIndex,
      target_slide_count: input.slideCount,
    },
  )

  if (error || !data) {
    logger.error(
      { err: error, topicId: input.topicId, studentId: input.studentId },
      'Slide progress save failed',
    )
    throw new AppError(
      500,
      'PROGRESS_SAVE_FAILED',
      'We could not save your slide progress. Try again.',
    )
  }

  return toProgress(data)
}

export async function listAttemptSummariesForStudentCourse(
  courseId: string,
  studentId: string,
): Promise<AttemptSummaryRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('quiz_attempts')
    .select(ATTEMPT_SUMMARY_COLUMNS)
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .order('attempt_number', { ascending: false })

  if (error) {
    logger.error(
      { err: error, courseId, studentId },
      'Attempt summary list failed',
    )
    throw new AppError(
      503,
      'ATTEMPT_LOAD_FAILED',
      'We could not load your quiz results. Try again.',
    )
  }

  return (data ?? []).map((row) => ({
    quizId: row.quiz_id,
    status: row.status,
    passed: row.passed,
    percentage: row.percentage,
    gradedAt: row.graded_at ? new Date(row.graded_at).toISOString() : null,
  }))
}

export async function listGradedAttemptsForQuiz(
  quizId: string,
): Promise<QuizResultAttemptRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('quiz_attempts')
    .select(RESULT_ATTEMPT_COLUMNS)
    .eq('quiz_id', quizId)
    .eq('status', 'graded')
    .order('attempt_number', { ascending: false })

  if (error) {
    logger.error({ err: error, quizId }, 'Quiz result attempts load failed')
    throw new AppError(
      503,
      'RESULTS_LOAD_FAILED',
      'We could not load this quiz’s results. Try again.',
    )
  }

  return (data ?? []).map(toResultAttempt)
}

export async function listGradedAttemptsForStudentCourse(
  courseId: string,
  studentId: string,
): Promise<QuizResultAttemptRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('quiz_attempts')
    .select(RESULT_ATTEMPT_COLUMNS)
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .eq('status', 'graded')
    .order('attempt_number', { ascending: false })

  if (error) {
    logger.error(
      { err: error, courseId, studentId },
      'Student quiz result attempts load failed',
    )
    throw new AppError(
      503,
      'RESULTS_LOAD_FAILED',
      'We could not load this student’s quiz results. Try again.',
    )
  }

  return (data ?? []).map(toResultAttempt)
}

export async function findLatestAttempt(
  quizId: string,
  studentId: string,
): Promise<QuizAttemptRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('quiz_attempts')
    .select(ATTEMPT_COLUMNS)
    .eq('quiz_id', quizId)
    .eq('student_id', studentId)
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error(
      { err: error, quizId, studentId },
      'Latest attempt load failed',
    )
    throw new AppError(
      503,
      'ATTEMPT_LOAD_FAILED',
      'We could not load your quiz result. Try again.',
    )
  }

  return data ? toAttempt(data) : null
}

export async function findInProgressAttempt(
  quizId: string,
  studentId: string,
): Promise<QuizAttemptRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('quiz_attempts')
    .select(ATTEMPT_COLUMNS)
    .eq('quiz_id', quizId)
    .eq('student_id', studentId)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (error) {
    logger.error({ err: error, quizId, studentId }, 'Attempt lookup failed')
    throw new AppError(
      503,
      'ATTEMPT_LOAD_FAILED',
      'We could not load your quiz attempt. Try again.',
    )
  }

  return data ? toAttempt(data) : null
}

export async function findAttemptById(
  attemptId: string,
): Promise<QuizAttemptRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('quiz_attempts')
    .select(ATTEMPT_COLUMNS)
    .eq('id', attemptId)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, attemptId }, 'Attempt lookup failed')
    throw new AppError(
      503,
      'ATTEMPT_LOAD_FAILED',
      'We could not load your quiz attempt. Try again.',
    )
  }

  return data ? toAttempt(data) : null
}

export async function listAttemptAnswers(
  attemptId: string,
): Promise<AttemptAnswerRecord[]> {
  const { data, error } = await supabaseAdmin
    .from('attempt_answers')
    .select(ANSWER_COLUMNS)
    .eq('attempt_id', attemptId)
    .order('created_at', { ascending: true })

  if (error) {
    logger.error({ err: error, attemptId }, 'Attempt answers load failed')
    throw new AppError(
      503,
      'ATTEMPT_LOAD_FAILED',
      'We could not load your answers. Try again.',
    )
  }

  return (data ?? []).map(toAnswer)
}

export async function createQuizAttempt(input: {
  quizId: string
  courseId: string
  topicId: string
  studentId: string
  snapshot: AttemptSnapshot
}): Promise<QuizAttemptRecord> {
  const { data, error } = await supabaseAdmin.rpc('create_quiz_attempt', {
    target_quiz_id: input.quizId,
    target_course_id: input.courseId,
    target_topic_id: input.topicId,
    target_student_id: input.studentId,
    target_snapshot: input.snapshot,
  })

  if (error) {
    logger.error(
      { err: error, quizId: input.quizId, studentId: input.studentId },
      'Attempt creation failed',
    )
    throw new AppError(
      500,
      'ATTEMPT_CREATE_FAILED',
      'We could not start this quiz. Try again.',
    )
  }

  if (!data) {
    logger.error(
      { quizId: input.quizId, studentId: input.studentId },
      'Attempt creation returned no row',
    )
    throw new AppError(
      500,
      'ATTEMPT_CREATE_FAILED',
      'We could not start this quiz. Try again.',
    )
  }

  return toAttempt(data)
}

export async function saveAttemptAnswers(
  attemptId: string,
  studentId: string,
  answers: AttemptAnswer[],
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('save_quiz_attempt_answers', {
    target_attempt_id: attemptId,
    target_student_id: studentId,
    target_answers: answers,
  })

  if (error) {
    logger.error({ err: error, attemptId }, 'Attempt answers save failed')
    throw new AppError(
      500,
      'ATTEMPT_SAVE_FAILED',
      'We could not save your answers. Try again.',
    )
  }
}

export async function gradeAttempt(input: {
  attemptId: string
  studentId: string
  grades: Array<{
    questionId: string
    isCorrect: boolean
    pointsAwarded: number
  }>
  score: number
  maxScore: number
  percentage: number
  passed: boolean
}): Promise<QuizAttemptRecord> {
  const { data, error } = await supabaseAdmin.rpc('grade_quiz_attempt', {
    target_attempt_id: input.attemptId,
    target_student_id: input.studentId,
    target_grades: input.grades,
    target_score: input.score,
    target_max_score: input.maxScore,
    target_percentage: input.percentage,
    target_passed: input.passed,
  })

  if (error || !data) {
    logger.error(
      { err: error, attemptId: input.attemptId },
      'Attempt grading failed',
    )
    throw new AppError(
      500,
      'ATTEMPT_GRADE_FAILED',
      'We could not grade this attempt. Try again.',
    )
  }

  return toAttempt(data)
}

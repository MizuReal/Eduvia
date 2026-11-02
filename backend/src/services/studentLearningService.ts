import {
  countQuizQuestionsByQuizIds,
  findFileForQuiz,
  getQuizById,
  listPublishedQuizzesForCourse,
  listQuizQuestions,
} from '../db/quizzes.js'
import type {
  QuizQuestionSelectRow,
  QuizSelectRow,
} from '../db/quizzes.js'
import { listTopicsAndLessons } from '../db/courseOutline.js'
import type { CourseTopic } from '../types/courseOutline.js'
import { findCourseEnrollmentPreview, findStudentEnrollment } from '../db/enrollments.js'
import {
  createQuizAttempt,
  findAttemptById,
  findInProgressAttempt,
  findLatestAttempt,
  gradeAttempt,
  listAttemptAnswers,
  listAttemptsForStudentCourse,
  listTopicProgressForCourse,
  recordTopicSlideProgress,
  saveAttemptAnswers,
} from '../db/learning.js'
import type {
  AttemptAnswerRecord,
  QuizAttemptRecord,
  TopicProgressRecord,
} from '../db/learning.js'
import { listContentForCourse } from '../db/topicContent.js'
import { AppError } from '../errors/AppError.js'
import { signFileForDelivery } from './fileService.js'
import { getStudentTopicMaterials } from './topicContentService.js'
import type { SaveAttemptAnswersInput } from '../schemas/learning.js'
import type { AuthenticatedUser } from '../types/auth.js'
import type {
  AttemptAnswer,
  AttemptQuestion,
  AttemptResult,
  AttemptSnapshot,
  AttemptSnapshotQuestion,
  SlideSource,
  StudentAttemptWorkspace,
  StudentQuizFile,
  StudentQuizSummary,
  StudentSubjectTopic,
  StudentSubjectWorkspace,
  StudentTopicContent,
  TopicLearningStatus,
  TopicProgress,
} from '../types/learning.js'
import type { FileRow } from '../db/database.types.js'

const DEFAULT_PROGRESS: TopicProgress = {
  presentationHighestSlideIndex: -1,
  slidesHighestSlideIndex: -1,
  presentationCompleted: false,
  slidesCompleted: false,
  completed: false,
}

function toTopicProgress(
  record: TopicProgressRecord | null,
  hasContent: boolean,
): TopicProgress {
  if (!record) {
    return {
      ...DEFAULT_PROGRESS,
      completed: !hasContent,
    }
  }

  return {
    presentationHighestSlideIndex: record.presentationHighestSlideIndex,
    slidesHighestSlideIndex: record.slidesHighestSlideIndex,
    presentationCompleted: record.presentationCompleted,
    slidesCompleted: record.slidesCompleted,
    completed: !hasContent
      ? true
      : record.presentationCompleted || record.slidesCompleted,
  }
}

function progressStarted(progress: TopicProgress): boolean {
  return (
    progress.presentationHighestSlideIndex >= 0 ||
    progress.slidesHighestSlideIndex >= 0 ||
    progress.presentationCompleted ||
    progress.slidesCompleted
  )
}

function toQuizSummary(
  quiz: QuizSelectRow,
  questionCount: number,
): StudentQuizSummary {
  return {
    id: quiz.id,
    title: quiz.title,
    mode: quiz.mode,
    questionCount,
    passingScore: quiz.passing_score,
  }
}

function latestAttemptsByQuiz(
  attempts: QuizAttemptRecord[],
): Map<string, QuizAttemptRecord> {
  const byQuiz = new Map<string, QuizAttemptRecord>()

  for (const attempt of attempts) {
    if (!byQuiz.has(attempt.quizId)) {
      byQuiz.set(attempt.quizId, attempt)
    }
  }

  return byQuiz
}

function isTopicComplete(status: TopicLearningStatus): boolean {
  return status === 'passed' || status === 'completed'
}

function resolveTopicStatus(
  locked: boolean,
  progress: TopicProgress,
  quiz: StudentQuizSummary | null,
  latestAttempt: QuizAttemptRecord | null,
): TopicLearningStatus {
  if (locked) {
    return 'locked'
  }

  if (latestAttempt?.status === 'graded' && latestAttempt.passed) {
    return 'passed'
  }

  if (!progress.completed) {
    return progressStarted(progress) ? 'in_progress' : 'not_started'
  }

  if (latestAttempt?.status === 'graded' && !latestAttempt.passed) {
    return 'not_passed'
  }

  return quiz ? 'ready' : 'completed'
}

function buildSubjectTopics(input: {
  topics: CourseTopic[]
  contentByTopic: Map<string, Array<{ kind: string }>>
  progressByTopic: Map<string, TopicProgressRecord>
  quizzesByTopic: Map<string, QuizSelectRow>
  questionCounts: Map<string, number>
  attemptsByQuiz: Map<string, QuizAttemptRecord>
}): StudentSubjectTopic[] {
  const result: StudentSubjectTopic[] = []
  let previousStatus: TopicLearningStatus | null = null

  for (const topic of input.topics) {
    const content = input.contentByTopic.get(topic.id) ?? []
    const hasContent = content.some(
      (row) => row.kind === 'slides' || row.kind === 'presentation',
    )
    const progress = toTopicProgress(
      input.progressByTopic.get(topic.id) ?? null,
      hasContent,
    )
    const quizRow = input.quizzesByTopic.get(topic.id) ?? null
    const quiz = quizRow
      ? toQuizSummary(
          quizRow,
          input.questionCounts.get(quizRow.id) ?? 0,
        )
      : null
    const latestAttempt = quizRow
      ? (input.attemptsByQuiz.get(quizRow.id) ?? null)
      : null
    const locked =
      previousStatus !== null && !isTopicComplete(previousStatus)
    const status = resolveTopicStatus(locked, progress, quiz, latestAttempt)

    result.push({
      ...topic,
      status,
      locked,
      progress,
      quiz,
    })
    previousStatus = status
  }

  return result
}

export async function getStudentSubjectWorkspace(
  user: AuthenticatedUser,
  courseId: string,
): Promise<StudentSubjectWorkspace> {
  const enrollment = await findStudentEnrollment(courseId, user.id)

  if (!enrollment || enrollment.status !== 'active') {
    throw new AppError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.')
  }

  const course = await findCourseEnrollmentPreview(courseId)

  if (!course) {
    throw new AppError(404, 'SUBJECT_NOT_FOUND', 'Subject not found.')
  }

  const [topics, content, progressRows, quizzes, attempts] = await Promise.all(
    [
      listTopicsAndLessons(courseId),
      listContentForCourse(courseId),
      listTopicProgressForCourse(courseId, user.id),
      listPublishedQuizzesForCourse(courseId),
      listAttemptsForStudentCourse(courseId, user.id),
    ],
  )
  const contentByTopic = new Map<string, Array<{ kind: string }>>()

  for (const row of content) {
    const rows = contentByTopic.get(row.topic_id) ?? []
    rows.push({ kind: row.kind })
    contentByTopic.set(row.topic_id, rows)
  }

  const progressByTopic = new Map(
    progressRows.map((row) => [row.topicId, row]),
  )
  const quizzesByTopic = new Map(
    quizzes.map((quiz) => [quiz.topic_id, quiz]),
  )
  const questionCounts = await countQuizQuestionsByQuizIds(
    quizzes.map((quiz) => quiz.id),
  )
  const subjectTopics = buildSubjectTopics({
    topics,
    contentByTopic,
    progressByTopic,
    quizzesByTopic,
    questionCounts,
    attemptsByQuiz: latestAttemptsByQuiz(attempts),
  })
  const completedTopics = subjectTopics.filter((topic) =>
    isTopicComplete(topic.status),
  ).length

  return {
    ...course,
    topics: subjectTopics,
    progress: {
      completedTopics,
      totalTopics: subjectTopics.length,
      percent:
        subjectTopics.length > 0
          ? Math.round((completedTopics / subjectTopics.length) * 100)
          : 0,
    },
  }
}

export async function getStudentTopicContent(
  user: AuthenticatedUser,
  topicId: string,
): Promise<StudentTopicContent> {
  const materials = await getStudentTopicMaterials(user, topicId)
  const workspace = await getStudentSubjectWorkspace(
    user,
    materials.topic.courseId,
  )
  const topic = workspace.topics.find((item) => item.id === topicId)

  if (!topic) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  if (topic.locked) {
    throw new AppError(
      403,
      'TOPIC_LOCKED',
      'Finish the previous topic to unlock this one.',
    )
  }

  const index = workspace.topics.findIndex((item) => item.id === topicId)
  const nextTopicId = workspace.topics[index + 1]?.id ?? null
  const latestAttempt = topic.quiz
    ? await findLatestAttempt(topic.quiz.id, user.id)
    : null

  return {
    ...materials,
    progress: topic.progress,
    quiz: topic.quiz,
    status: topic.status,
    latestAttempt: latestAttempt
      ? {
          percentage: latestAttempt.percentage ?? 0,
          passed: latestAttempt.passed ?? false,
          gradedAt: latestAttempt.gradedAt,
        }
      : null,
    locked: false,
    nextTopicId,
  }
}

export async function recordSlideProgress(
  user: AuthenticatedUser,
  topicId: string,
  source: SlideSource,
  slideIndex: number,
): Promise<TopicProgress> {
  const materials = await getStudentTopicMaterials(user, topicId)
  const workspace = await getStudentSubjectWorkspace(
    user,
    materials.topic.courseId,
  )
  const topic = workspace.topics.find((item) => item.id === topicId)

  if (!topic) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  if (topic.locked) {
    throw new AppError(
      403,
      'TOPIC_LOCKED',
      'Finish the previous topic to unlock this one.',
    )
  }

  const slideCount =
    source === 'slides'
      ? (materials.slides?.content.slides.length ?? 0)
      : materials.upload
        ? Math.max(1, materials.upload.previews.length)
        : 0

  if (slideCount === 0) {
    throw new AppError(
      400,
      'SLIDE_SOURCE_EMPTY',
      'This slide source is not available.',
    )
  }

  const safeIndex = Math.min(Math.max(0, slideIndex), slideCount - 1)
  const progress = await recordTopicSlideProgress({
    courseId: materials.topic.courseId,
    topicId,
    studentId: user.id,
    source: source === 'upload' ? 'presentation' : 'slides',
    slideIndex: safeIndex,
    slideCount,
  })

  return toTopicProgress(progress, true)
}

async function buildAttemptWorkspace(
  attempt: QuizAttemptRecord,
): Promise<StudentAttemptWorkspace> {
  const snapshot = attempt.snapshot
  const answerRows = await listAttemptAnswers(attempt.id)
  const paperRow = snapshot.fileId
    ? await findFileForQuiz(snapshot.fileId)
    : null
  const paper =
    paperRow && paperRow.status === 'ready'
      ? await toStudentQuizFile(paperRow)
      : null
  const answers: AttemptAnswer[] = answerRows.map((answer) => ({
    questionId: answer.questionId,
    selectedOption: answer.selectedOption,
  }))
  const questions: AttemptQuestion[] = snapshot.questions.map((question) => ({
    id: question.id,
    orderIndex: question.orderIndex,
    prompt: question.prompt,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    points: question.points,
  }))
  const result =
    attempt.status === 'graded'
      ? buildAttemptResult(snapshot, answerRows, attempt.passed ?? false)
      : null

  return {
    id: attempt.id,
    quizId: attempt.quizId,
    topicId: attempt.topicId,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    quiz: {
      title: snapshot.title,
      instructions: snapshot.instructions,
      passingScore: snapshot.passingScore,
      mode: snapshot.mode,
    },
    questions,
    answers,
    paper,
    result,
  }
}

function buildAttemptResult(
  snapshot: AttemptSnapshot,
  answers: AttemptAnswerRecord[],
  passed: boolean,
): AttemptResult {
  const answersByQuestion = new Map(
    answers.map((answer) => [answer.questionId, answer]),
  )
  let score = 0
  let maxScore = 0

  const resultAnswers = snapshot.questions.map((question) => {
    const answer = answersByQuestion.get(question.id)
    const selectedOption = answer?.selectedOption ?? question.correctOption
    const isCorrect = answer?.isCorrect ?? false
    const pointsAwarded = answer?.pointsAwarded ?? 0
    maxScore += question.points
    score += pointsAwarded

    return {
      questionId: question.id,
      selectedOption,
      correctOption: passed ? question.correctOption : null,
      isCorrect,
      pointsAwarded,
    }
  })

  return {
    score,
    maxScore,
    percentage:
      maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    passed,
    answers: resultAnswers,
  }
}

async function toStudentQuizFile(fileRow: FileRow): Promise<StudentQuizFile> {
  const signed = await signFileForDelivery(fileRow)

  return {
    id: fileRow.id,
    originalName: fileRow.original_name,
    mimeType: fileRow.mime_type,
    sizeBytes: fileRow.size_bytes,
    fileClass: fileRow.file_class,
    width: fileRow.width,
    height: fileRow.height,
    status: fileRow.status,
    previewHtml: fileRow.preview_html,
    url: signed.url,
    expiresAt: signed.expiresAt,
  }
}

function buildSnapshot(
  quiz: QuizSelectRow,
  questions: QuizQuestionSelectRow[],
): AttemptSnapshot {
  const snapshotQuestions: AttemptSnapshotQuestion[] = questions.map(
    (question) => ({
      id: question.id,
      orderIndex: question.order_index,
      prompt: question.prompt,
      optionA: question.option_a,
      optionB: question.option_b,
      optionC: question.option_c,
      optionD: question.option_d,
      points: question.points,
      correctOption: question.correct_option,
      explanation: question.explanation,
    }),
  )

  return {
    quizId: quiz.id,
    version: quiz.version,
    mode: quiz.mode,
    title: quiz.title,
    instructions: quiz.instructions,
    passingScore: quiz.passing_score,
    fileId: quiz.file_id,
    questions: snapshotQuestions,
  }
}

async function requirePublishedQuiz(
  user: AuthenticatedUser,
  quizId: string,
): Promise<{
  quiz: QuizSelectRow
  questions: QuizQuestionSelectRow[]
  topic: StudentSubjectTopic
}> {
  const quiz = await getQuizById(quizId)

  if (!quiz || quiz.status !== 'published') {
    throw new AppError(404, 'QUIZ_NOT_FOUND', 'Quiz not found.')
  }

  const workspace = await getStudentSubjectWorkspace(user, quiz.course_id)
  const topic = workspace.topics.find((item) => item.id === quiz.topic_id)

  if (!topic) {
    throw new AppError(404, 'QUIZ_NOT_FOUND', 'Quiz not found.')
  }

  if (topic.locked) {
    throw new AppError(
      403,
      'TOPIC_LOCKED',
      'Finish the previous topic to unlock this quiz.',
    )
  }

  if (!topic.progress.completed) {
    throw new AppError(
      409,
      'SLIDES_NOT_COMPLETE',
      'Finish the topic slides before taking the quiz.',
    )
  }

  const questions = await listQuizQuestions(quiz.id)

  if (quiz.mode === 'document' && !quiz.file_id) {
    throw new AppError(
      409,
      'QUIZ_NOT_READY',
      'This quiz paper is not available yet.',
    )
  }

  if (quiz.mode === 'document') {
    const paper = await findFileForQuiz(quiz.file_id)

    if (!paper || paper.status !== 'ready') {
      throw new AppError(
        409,
        'QUIZ_NOT_READY',
        'This quiz paper is not available yet.',
      )
    }
  }

  return { quiz, questions, topic }
}

export async function startQuizAttempt(
  user: AuthenticatedUser,
  quizId: string,
): Promise<StudentAttemptWorkspace> {
  const { quiz, questions } = await requirePublishedQuiz(user, quizId)
  const latest = await findLatestAttempt(quizId, user.id)

  if (latest?.status === 'graded' && latest.passed) {
    throw new AppError(
      409,
      'QUIZ_ALREADY_PASSED',
      'You already passed this quiz.',
    )
  }

  const inProgress = await findInProgressAttempt(quizId, user.id)

  if (inProgress) {
    return buildAttemptWorkspace(inProgress)
  }

  if (questions.length === 0) {
    throw new AppError(
      409,
      'QUIZ_NOT_READY',
      'This quiz does not have questions yet.',
    )
  }

  const attempt = await createQuizAttempt({
    quizId,
    courseId: quiz.course_id,
    topicId: quiz.topic_id,
    studentId: user.id,
    snapshot: buildSnapshot(quiz, questions),
  })

  return buildAttemptWorkspace(attempt)
}

export async function getStudentAttempt(
  user: AuthenticatedUser,
  attemptId: string,
): Promise<StudentAttemptWorkspace> {
  const attempt = await findAttemptById(attemptId)

  if (!attempt || attempt.studentId !== user.id) {
    throw new AppError(404, 'ATTEMPT_NOT_FOUND', 'Quiz attempt not found.')
  }

  return buildAttemptWorkspace(attempt)
}

export async function saveStudentAttemptAnswers(
  user: AuthenticatedUser,
  attemptId: string,
  input: SaveAttemptAnswersInput,
): Promise<StudentAttemptWorkspace> {
  const attempt = await findAttemptById(attemptId)

  if (!attempt || attempt.studentId !== user.id) {
    throw new AppError(404, 'ATTEMPT_NOT_FOUND', 'Quiz attempt not found.')
  }

  if (attempt.status !== 'in_progress') {
    throw new AppError(
      409,
      'ATTEMPT_NOT_EDITABLE',
      'This attempt has already been submitted.',
    )
  }

  const questionIds = new Set(
    attempt.snapshot.questions.map((question) => question.id),
  )
  const seen = new Set<string>()

  for (const answer of input.answers) {
    if (!questionIds.has(answer.questionId)) {
      throw new AppError(
        400,
        'INVALID_ANSWER',
        'One of the answers does not belong to this quiz.',
      )
    }

    if (seen.has(answer.questionId)) {
      throw new AppError(
        400,
        'INVALID_ANSWER',
        'Each question can only have one answer.',
      )
    }

    seen.add(answer.questionId)
  }

  await saveAttemptAnswers(attemptId, user.id, input.answers)

  return buildAttemptWorkspace(attempt)
}

export async function submitStudentAttempt(
  user: AuthenticatedUser,
  attemptId: string,
): Promise<StudentAttemptWorkspace> {
  const attempt = await findAttemptById(attemptId)

  if (!attempt || attempt.studentId !== user.id) {
    throw new AppError(404, 'ATTEMPT_NOT_FOUND', 'Quiz attempt not found.')
  }

  if (attempt.status !== 'in_progress') {
    throw new AppError(
      409,
      'ATTEMPT_NOT_EDITABLE',
      'This attempt has already been submitted.',
    )
  }

  const answers = await listAttemptAnswers(attemptId)
  const answersByQuestion = new Map(
    answers.map((answer) => [answer.questionId, answer]),
  )

  if (answers.length !== attempt.snapshot.questions.length) {
    throw new AppError(
      400,
      'QUIZ_INCOMPLETE',
      'Answer every question before submitting.',
    )
  }

  let score = 0
  let maxScore = 0
  const grades = attempt.snapshot.questions.map((question) => {
    const answer = answersByQuestion.get(question.id)

    if (!answer) {
      throw new AppError(
        400,
        'QUIZ_INCOMPLETE',
        'Answer every question before submitting.',
      )
    }

    const isCorrect = answer.selectedOption === question.correctOption
    const pointsAwarded = isCorrect ? question.points : 0
    maxScore += question.points
    score += pointsAwarded

    return {
      questionId: question.id,
      isCorrect,
      pointsAwarded,
    }
  })
  const percentage =
    maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const passed = percentage >= attempt.snapshot.passingScore

  await gradeAttempt({
    attemptId,
    studentId: user.id,
    grades,
    score,
    maxScore,
    percentage,
    passed,
  })

  const graded = await findAttemptById(attemptId)

  if (!graded) {
    throw new AppError(
      500,
      'ATTEMPT_GRADE_FAILED',
      'We could not load your quiz result. Try again.',
    )
  }

  return buildAttemptWorkspace(graded)
}

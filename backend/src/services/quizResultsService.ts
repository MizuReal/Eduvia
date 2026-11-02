import {
  listGradedAttemptsForQuiz,
  listGradedAttemptsForStudentCourse,
} from '../db/learning.js'
import type { QuizResultAttemptRecord } from '../db/learning.js'
import { findCourseForInstructor } from '../db/courses.js'
import {
  findTopicForInstructor,
  listTopicsAndLessons,
} from '../db/courseOutline.js'
import {
  findStudentEnrollment,
  listEnrollmentsForCourse,
  listStudentsByIds,
} from '../db/enrollments.js'
import { listStudentNamesByIds } from '../db/profiles.js'
import {
  findQuizByTopic,
  listPublishedQuizzesForCourse,
} from '../db/quizzes.js'
import { AppError } from '../errors/AppError.js'
import type { AuthenticatedUser } from '../types/auth.js'
import type {
  QuizResultStatus,
  StudentQuizResults,
  TopicQuizResults,
} from '../types/quizResults.js'

type AttemptSummary = {
  attempts: number
  bestScore: number | null
  maxScore: number | null
  percentage: number | null
  passed: boolean | null
  lastSubmittedAt: string | null
}

function emptySummary(): AttemptSummary {
  return {
    attempts: 0,
    bestScore: null,
    maxScore: null,
    percentage: null,
    passed: null,
    lastSubmittedAt: null,
  }
}

function hasPercentage(
  attempt: QuizResultAttemptRecord,
): attempt is QuizResultAttemptRecord & { percentage: number } {
  return attempt.percentage !== null
}

function attemptTimestamp(attempt: QuizResultAttemptRecord): string | null {
  return attempt.submittedAt ?? attempt.gradedAt
}

function summarizeAttempts(
  attempts: QuizResultAttemptRecord[],
): AttemptSummary {
  if (attempts.length === 0) {
    return emptySummary()
  }

  const scored = attempts.filter(hasPercentage)
  const [first, ...rest] = scored

  if (!first) {
    return {
      ...emptySummary(),
      attempts: attempts.length,
    }
  }

  let best: QuizResultAttemptRecord & { percentage: number } = first

  for (const attempt of rest) {
    const isHigher = attempt.percentage > best.percentage
    const isNewerTie =
      attempt.percentage === best.percentage &&
      (attemptTimestamp(attempt) ?? '') > (attemptTimestamp(best) ?? '')

    if (isHigher || isNewerTie) {
      best = attempt
    }
  }

  const lastSubmittedAt = attempts.reduce<string | null>((latest, attempt) => {
    const stamp = attemptTimestamp(attempt)

    return stamp && (!latest || stamp > latest) ? stamp : latest
  }, null)

  return {
    attempts: attempts.length,
    bestScore: best.score,
    maxScore: best.maxScore,
    percentage: best.percentage,
    passed: best.passed,
    lastSubmittedAt,
  }
}

function resultStatus(summary: AttemptSummary): QuizResultStatus {
  if (summary.percentage === null) {
    return 'not_taken'
  }

  return summary.passed === true ? 'passed' : 'failed'
}

function compareStudentNames(
  left: { username: string; firstName: string; lastName: string },
  right: { username: string; firstName: string; lastName: string },
): number {
  const leftLastName =
    left.lastName || left.firstName || left.username
  const rightLastName =
    right.lastName || right.firstName || right.username
  const byLastName = leftLastName.localeCompare(rightLastName, undefined, {
    sensitivity: 'base',
  })

  if (byLastName !== 0) {
    return byLastName
  }

  const byFirstName = left.firstName.localeCompare(
    right.firstName,
    undefined,
    { sensitivity: 'base' },
  )

  if (byFirstName !== 0) {
    return byFirstName
  }

  return left.username.localeCompare(right.username, undefined, {
    sensitivity: 'base',
  })
}

function groupAttempts<TKey>(
  attempts: QuizResultAttemptRecord[],
  getKey: (attempt: QuizResultAttemptRecord) => TKey,
): Map<TKey, QuizResultAttemptRecord[]> {
  const grouped = new Map<TKey, QuizResultAttemptRecord[]>()

  for (const attempt of attempts) {
    const key = getKey(attempt)
    const rows = grouped.get(key) ?? []
    rows.push(attempt)
    grouped.set(key, rows)
  }

  return grouped
}

export async function getTopicQuizResults(
  user: AuthenticatedUser,
  topicId: string,
): Promise<TopicQuizResults> {
  const topic = await findTopicForInstructor(topicId, user.id)

  if (!topic) {
    throw new AppError(404, 'TOPIC_NOT_FOUND', 'Topic not found.')
  }

  const quiz = await findQuizByTopic(topicId)

  if (!quiz) {
    return {
      topic: {
        id: topic.id,
        title: topic.title,
      },
      quiz: null,
      rows: [],
    }
  }

  const [enrollments, attempts] = await Promise.all([
    listEnrollmentsForCourse(topic.course_id),
    listGradedAttemptsForQuiz(quiz.id),
  ])
  const activeEnrollments = enrollments.filter(
    (enrollment) => enrollment.status === 'active',
  )
  const students = await listStudentNamesByIds(
    activeEnrollments.map((enrollment) => enrollment.studentId),
  )
  const attemptsByStudent = groupAttempts(
    attempts,
    (attempt) => attempt.studentId,
  )

  const rows = activeEnrollments
    .flatMap((enrollment) => {
      const student = students.get(enrollment.studentId)

      if (!student) {
        return []
      }

      const summary = summarizeAttempts(attemptsByStudent.get(student.id) ?? [])

      return [
        {
          studentId: student.id,
          username: student.username,
          firstName: student.firstName,
          lastName: student.lastName,
          faculty: student.faculty,
          ...summary,
          status: resultStatus(summary),
        },
      ]
    })
    .sort(compareStudentNames)

  return {
    topic: {
      id: topic.id,
      title: topic.title,
    },
    quiz: {
      id: quiz.id,
      title: quiz.title,
      mode: quiz.mode,
      status: quiz.status,
      version: quiz.version,
      passingScore: quiz.passing_score,
    },
    rows,
  }
}

export async function getStudentQuizResults(
  user: AuthenticatedUser,
  courseId: string,
  studentId: string,
): Promise<StudentQuizResults> {
  const course = await findCourseForInstructor(courseId, user.id)

  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Subject not found.')
  }

  const enrollment = await findStudentEnrollment(courseId, studentId)

  if (!enrollment) {
    throw new AppError(404, 'STUDENT_NOT_FOUND', 'Student not found.')
  }

  const [topics, quizzes, attempts, students] = await Promise.all([
    listTopicsAndLessons(courseId),
    listPublishedQuizzesForCourse(courseId),
    listGradedAttemptsForStudentCourse(courseId, studentId),
    listStudentsByIds([studentId]),
  ])
  const student = students.get(studentId)

  if (!student) {
    throw new AppError(404, 'STUDENT_NOT_FOUND', 'Student not found.')
  }

  const quizzesByTopic = new Map(quizzes.map((quiz) => [quiz.topic_id, quiz]))
  const attemptsByQuiz = groupAttempts(attempts, (attempt) => attempt.quizId)

  const rows = topics.flatMap((topic) => {
    const quiz = quizzesByTopic.get(topic.id)

    if (!quiz) {
      return []
    }

    const summary = summarizeAttempts(attemptsByQuiz.get(quiz.id) ?? [])

    return [
      {
        topicId: topic.id,
        topicTitle: topic.title,
        topicOrderIndex: topic.orderIndex,
        quizId: quiz.id,
        quizTitle: quiz.title,
        quizMode: quiz.mode,
        passingScore: quiz.passing_score,
        ...summary,
        status: resultStatus(summary),
      },
    ]
  })

  return {
    course,
    student: {
      id: student.id,
      username: student.username,
      faculty: student.faculty,
    },
    rows,
  }
}

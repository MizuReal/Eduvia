import { INITIAL_ORDER_INDEX } from '../config/constants.js'
import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import type { CourseTopic, Lesson } from '../types/courseOutline.js'
import type { CourseTopicRow, LessonRow } from './database.types.js'
import { supabaseAdmin } from './supabaseAdmin.js'

const TOPIC_COLUMNS = 'id, title, order_index, created_at, updated_at'
const LESSON_COLUMNS =
  'id, topic_id, title, order_index, created_at, updated_at'

type CourseTopicSelectRow = Pick<
  CourseTopicRow,
  'id' | 'title' | 'order_index' | 'created_at' | 'updated_at'
>

type LessonSelectRow = Pick<
  LessonRow,
  'id' | 'topic_id' | 'title' | 'order_index' | 'created_at' | 'updated_at'
>

function toTopicBase(row: CourseTopicSelectRow): Omit<CourseTopic, 'lessons'> {
  return {
    id: row.id,
    title: row.title,
    orderIndex: row.order_index,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

function toLesson(row: LessonSelectRow): Lesson {
  return {
    id: row.id,
    topicId: row.topic_id,
    title: row.title,
    orderIndex: row.order_index,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

export async function listTopicsAndLessons(
  courseId: string,
): Promise<CourseTopic[]> {
  const [topicsResult, lessonsResult] = await Promise.all([
    supabaseAdmin
      .from('course_topics')
      .select(TOPIC_COLUMNS)
      .eq('course_id', courseId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('lessons')
      .select(LESSON_COLUMNS)
      .eq('course_id', courseId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (topicsResult.error || lessonsResult.error) {
    logger.error(
      { err: topicsResult.error ?? lessonsResult.error, courseId },
      'Course outline load failed',
    )
    throw new AppError(
      503,
      'OUTLINE_LOAD_FAILED',
      'We could not load the table of contents. Try again.',
    )
  }

  const lessonsByTopic = new Map<string, Lesson[]>()

  for (const row of lessonsResult.data ?? []) {
    const lessons = lessonsByTopic.get(row.topic_id) ?? []
    lessons.push(toLesson(row))
    lessonsByTopic.set(row.topic_id, lessons)
  }

  return (topicsResult.data ?? []).map((row) => ({
    ...toTopicBase(row),
    lessons: lessonsByTopic.get(row.id) ?? [],
  }))
}

export async function insertTopic(
  courseId: string,
  title: string,
  orderIndex: number,
): Promise<CourseTopic> {
  const { data, error } = await supabaseAdmin
    .from('course_topics')
    .insert({
      course_id: courseId,
      title,
      order_index: orderIndex,
    })
    .select(TOPIC_COLUMNS)
    .single()

  if (error || !data) {
    logger.error({ err: error, courseId }, 'Topic creation failed')
    throw new AppError(
      500,
      'TOPIC_CREATION_FAILED',
      'We could not create the topic. Try again.',
    )
  }

  return {
    ...toTopicBase(data),
    lessons: [],
  }
}

export async function insertLesson(
  courseId: string,
  topicId: string,
  title: string,
  orderIndex: number,
): Promise<Lesson> {
  const { data, error } = await supabaseAdmin
    .from('lessons')
    .insert({
      course_id: courseId,
      topic_id: topicId,
      title,
      order_index: orderIndex,
    })
    .select(LESSON_COLUMNS)
    .single()

  if (error || !data) {
    logger.error({ err: error, courseId, topicId }, 'Lesson creation failed')
    throw new AppError(
      500,
      'LESSON_CREATION_FAILED',
      'We could not create the lesson. Try again.',
    )
  }

  return toLesson(data)
}

export async function findTopicForCourse(
  courseId: string,
  topicId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('course_topics')
    .select('id')
    .eq('id', topicId)
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, courseId, topicId }, 'Topic lookup failed')
    throw new AppError(
      503,
      'TOPIC_LOOKUP_FAILED',
      'We could not load that topic. Try again.',
    )
  }

  return data
}

export async function getNextTopicOrderIndex(
  courseId: string,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('course_topics')
    .select('order_index')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, courseId }, 'Topic order lookup failed')
    throw new AppError(
      503,
      'TOPIC_ORDER_LOOKUP_FAILED',
      'We could not create the topic. Try again.',
    )
  }

  return data ? data.order_index + 1 : INITIAL_ORDER_INDEX
}

export async function getNextLessonOrderIndex(
  topicId: string,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('lessons')
    .select('order_index')
    .eq('topic_id', topicId)
    .is('deleted_at', null)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, topicId }, 'Lesson order lookup failed')
    throw new AppError(
      503,
      'LESSON_ORDER_LOOKUP_FAILED',
      'We could not create the lesson. Try again.',
    )
  }

  return data ? data.order_index + 1 : INITIAL_ORDER_INDEX
}

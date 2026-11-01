import { INITIAL_ORDER_INDEX } from '../config/constants.js'
import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import type {
  CourseTopic,
  CourseTopicSummary,
  CourseTrash,
  DeletedLesson,
  DeletedTopic,
  Lesson,
} from '../types/courseOutline.js'
import type { CourseTopicRow, LessonRow } from './database.types.js'
import { findCourseForInstructor } from './courses.js'
import { supabaseAdmin } from './supabaseAdmin.js'

const TOPIC_COLUMNS = 'id, title, order_index, created_at, updated_at'
const LESSON_COLUMNS =
  'id, topic_id, title, order_index, created_at, updated_at'
const TOPIC_LOOKUP_COLUMNS =
  'id, course_id, title, order_index, created_at, updated_at'
const LESSON_LOOKUP_COLUMNS =
  'id, course_id, topic_id, title, order_index, created_at, updated_at'
const TOPIC_TRASH_COLUMNS = 'id, course_id, title, deleted_at'
const LESSON_TRASH_COLUMNS =
  'id, course_id, topic_id, title, deleted_at, deleted_batch_id'

type CourseTopicSelectRow = Pick<
  CourseTopicRow,
  'id' | 'title' | 'order_index' | 'created_at' | 'updated_at'
>

type LessonSelectRow = Pick<
  LessonRow,
  'id' | 'topic_id' | 'title' | 'order_index' | 'created_at' | 'updated_at'
>

export type TopicLookupRow = Pick<
  CourseTopicRow,
  'id' | 'course_id' | 'title' | 'order_index' | 'created_at' | 'updated_at'
>

export type LessonLookupRow = Pick<
  LessonRow,
  | 'id'
  | 'course_id'
  | 'topic_id'
  | 'title'
  | 'order_index'
  | 'created_at'
  | 'updated_at'
>

type DeletedTopicRow = Pick<
  CourseTopicRow,
  'id' | 'course_id' | 'title' | 'deleted_at'
>

type DeletedLessonRow = Pick<
  LessonRow,
  'id' | 'course_id' | 'topic_id' | 'title' | 'deleted_at' | 'deleted_batch_id'
>

function toTopicBase(row: CourseTopicSelectRow): CourseTopicSummary {
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

export async function findTopicForInstructor(
  topicId: string,
  instructorId: string,
): Promise<TopicLookupRow | null> {
  const { data, error } = await supabaseAdmin
    .from('course_topics')
    .select(TOPIC_LOOKUP_COLUMNS)
    .eq('id', topicId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, topicId }, 'Topic ownership lookup failed')
    throw new AppError(
      503,
      'TOPIC_LOOKUP_FAILED',
      'We could not load that topic. Try again.',
    )
  }

  if (!data) {
    return null
  }

  const course = await findCourseForInstructor(data.course_id, instructorId)

  return course ? data : null
}

export async function findLessonForInstructor(
  lessonId: string,
  instructorId: string,
): Promise<LessonLookupRow | null> {
  const { data, error } = await supabaseAdmin
    .from('lessons')
    .select(LESSON_LOOKUP_COLUMNS)
    .eq('id', lessonId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, lessonId }, 'Lesson ownership lookup failed')
    throw new AppError(
      503,
      'LESSON_LOOKUP_FAILED',
      'We could not load that lesson. Try again.',
    )
  }

  if (!data) {
    return null
  }

  const course = await findCourseForInstructor(data.course_id, instructorId)

  return course ? data : null
}

export async function findDeletedTopicForInstructor(
  topicId: string,
  instructorId: string,
): Promise<DeletedTopicRow | null> {
  const { data, error } = await supabaseAdmin
    .from('course_topics')
    .select(TOPIC_TRASH_COLUMNS)
    .eq('id', topicId)
    .not('deleted_at', 'is', null)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, topicId }, 'Deleted topic lookup failed')
    throw new AppError(
      503,
      'TOPIC_LOOKUP_FAILED',
      'We could not load that topic. Try again.',
    )
  }

  if (!data) {
    return null
  }

  const course = await findCourseForInstructor(data.course_id, instructorId)

  return course ? data : null
}

export async function findDeletedLessonForInstructor(
  lessonId: string,
  instructorId: string,
): Promise<DeletedLessonRow | null> {
  const { data, error } = await supabaseAdmin
    .from('lessons')
    .select(LESSON_TRASH_COLUMNS)
    .eq('id', lessonId)
    .not('deleted_at', 'is', null)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, lessonId }, 'Deleted lesson lookup failed')
    throw new AppError(
      503,
      'LESSON_LOOKUP_FAILED',
      'We could not load that lesson. Try again.',
    )
  }

  if (!data) {
    return null
  }

  const course = await findCourseForInstructor(data.course_id, instructorId)

  return course ? data : null
}

export async function updateTopicTitle(
  topicId: string,
  title: string,
): Promise<CourseTopicSummary> {
  const { data, error } = await supabaseAdmin
    .from('course_topics')
    .update({ title })
    .eq('id', topicId)
    .is('deleted_at', null)
    .select(TOPIC_COLUMNS)
    .single()

  if (error || !data) {
    logger.error({ err: error, topicId }, 'Topic update failed')
    throw new AppError(
      500,
      'TOPIC_UPDATE_FAILED',
      'We could not update the topic. Try again.',
    )
  }

  return toTopicBase(data)
}

export async function softDeleteTopic(topicId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('course_topics')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', topicId)
    .is('deleted_at', null)

  if (error) {
    logger.error({ err: error, topicId }, 'Topic delete failed')
    throw new AppError(
      500,
      'TOPIC_DELETE_FAILED',
      'We could not delete the topic. Try again.',
    )
  }
}

export async function updateLessonRecord(
  lessonId: string,
  input: { title?: string; topicId?: string },
): Promise<Lesson> {
  const { error } = await supabaseAdmin.rpc('update_lesson', {
    target_lesson_id: lessonId,
    new_title: input.title ?? null,
    new_topic_id: input.topicId ?? null,
  })

  if (error) {
    logger.error({ err: error, lessonId }, 'Lesson update failed')
    throw new AppError(
      500,
      'LESSON_UPDATE_FAILED',
      'We could not update the lesson. Try again.',
    )
  }

  const lesson = await getLessonById(lessonId)

  if (!lesson) {
    throw new AppError(
      500,
      'LESSON_UPDATE_FAILED',
      'We could not update the lesson. Try again.',
    )
  }

  return lesson
}

export async function softDeleteLesson(lessonId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('lessons')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', lessonId)
    .is('deleted_at', null)

  if (error) {
    logger.error({ err: error, lessonId }, 'Lesson delete failed')
    throw new AppError(
      500,
      'LESSON_DELETE_FAILED',
      'We could not delete the lesson. Try again.',
    )
  }
}

export async function reorderCourseTopics(
  courseId: string,
  topicIds: string[],
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('reorder_course_topics', {
    target_course_id: courseId,
    ordered_ids: topicIds,
  })

  if (error) {
    logger.error({ err: error, courseId }, 'Topic reorder failed')
    throw new AppError(
      500,
      'REORDER_FAILED',
      'We could not reorder the topics. Try again.',
    )
  }
}

export async function reorderTopicLessons(
  topicId: string,
  lessonIds: string[],
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('reorder_topic_lessons', {
    target_topic_id: topicId,
    ordered_ids: lessonIds,
  })

  if (error) {
    logger.error({ err: error, topicId }, 'Lesson reorder failed')
    throw new AppError(
      500,
      'REORDER_FAILED',
      'We could not reorder the lessons. Try again.',
    )
  }
}

export async function getLessonById(lessonId: string): Promise<Lesson | null> {
  const { data, error } = await supabaseAdmin
    .from('lessons')
    .select(LESSON_COLUMNS)
    .eq('id', lessonId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, lessonId }, 'Lesson lookup failed')
    throw new AppError(
      503,
      'LESSON_LOOKUP_FAILED',
      'We could not load that lesson. Try again.',
    )
  }

  return data ? toLesson(data) : null
}

export async function getTopicWithLessons(
  topicId: string,
): Promise<CourseTopic | null> {
  const [topicResult, lessonsResult] = await Promise.all([
    supabaseAdmin
      .from('course_topics')
      .select(TOPIC_COLUMNS)
      .eq('id', topicId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabaseAdmin
      .from('lessons')
      .select(LESSON_COLUMNS)
      .eq('topic_id', topicId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (topicResult.error || lessonsResult.error) {
    logger.error(
      { err: topicResult.error ?? lessonsResult.error, topicId },
      'Topic load failed',
    )
    throw new AppError(
      503,
      'TOPIC_LOOKUP_FAILED',
      'We could not load that topic. Try again.',
    )
  }

  if (!topicResult.data) {
    return null
  }

  return {
    ...toTopicBase(topicResult.data),
    lessons: (lessonsResult.data ?? []).map(toLesson),
  }
}

export async function restoreTopic(topicId: string): Promise<CourseTopic> {
  const { error } = await supabaseAdmin.rpc('restore_topic', {
    target_topic_id: topicId,
  })

  if (error) {
    logger.error({ err: error, topicId }, 'Topic restore failed')
    throw new AppError(
      500,
      'TOPIC_RESTORE_FAILED',
      'We could not restore the topic. Try again.',
    )
  }

  const topic = await getTopicWithLessons(topicId)

  if (!topic) {
    throw new AppError(
      500,
      'TOPIC_RESTORE_FAILED',
      'We could not restore the topic. Try again.',
    )
  }

  return topic
}

export async function restoreLesson(lessonId: string): Promise<Lesson> {
  const { error } = await supabaseAdmin.rpc('restore_lesson', {
    target_lesson_id: lessonId,
  })

  if (error) {
    logger.error({ err: error, lessonId }, 'Lesson restore failed')
    throw new AppError(
      500,
      'LESSON_RESTORE_FAILED',
      'We could not restore the lesson. Try again.',
    )
  }

  const lesson = await getLessonById(lessonId)

  if (!lesson) {
    throw new AppError(
      500,
      'LESSON_RESTORE_FAILED',
      'We could not restore the lesson. Try again.',
    )
  }

  return lesson
}

export async function getCourseTrash(courseId: string): Promise<CourseTrash> {
  const [deletedTopicsResult, deletedLessonsResult, allTopicsResult] =
    await Promise.all([
      supabaseAdmin
        .from('course_topics')
        .select(TOPIC_TRASH_COLUMNS)
        .eq('course_id', courseId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabaseAdmin
        .from('lessons')
        .select(LESSON_TRASH_COLUMNS)
        .eq('course_id', courseId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabaseAdmin
        .from('course_topics')
        .select(TOPIC_TRASH_COLUMNS)
        .eq('course_id', courseId),
    ])

  if (
    deletedTopicsResult.error ||
    deletedLessonsResult.error ||
    allTopicsResult.error
  ) {
    logger.error(
      {
        err:
          deletedTopicsResult.error ??
          deletedLessonsResult.error ??
          allTopicsResult.error,
        courseId,
      },
      'Course trash load failed',
    )
    throw new AppError(
      503,
      'TRASH_LOAD_FAILED',
      'We could not load deleted items. Try again.',
    )
  }

  const allTopics = new Map(
    (allTopicsResult.data ?? []).map((row) => [row.id, row]),
  )
  const deletedLessons = deletedLessonsResult.data ?? []
  const batchCounts = new Map<string, number>()

  for (const row of deletedLessons) {
    if (row.deleted_batch_id) {
      batchCounts.set(
        row.deleted_batch_id,
        (batchCounts.get(row.deleted_batch_id) ?? 0) + 1,
      )
    }
  }

  const topics: DeletedTopic[] = (deletedTopicsResult.data ?? []).flatMap(
    (row) => {
      if (!row.deleted_at) {
        return []
      }

      return [
        {
          id: row.id,
          title: row.title,
          deletedAt: new Date(row.deleted_at).toISOString(),
          lessonCount: batchCounts.get(row.id) ?? 0,
        },
      ]
    },
  )

  const lessons: DeletedLesson[] = deletedLessons.flatMap((row) => {
    if (!row.deleted_at || row.deleted_batch_id) {
      return []
    }

    const parentTopic = allTopics.get(row.topic_id)

    return [
      {
        id: row.id,
        title: row.title,
        topicId: row.topic_id,
        topicTitle: parentTopic?.title ?? 'Unknown topic',
        deletedAt: new Date(row.deleted_at).toISOString(),
        restorable: parentTopic?.deleted_at === null,
      },
    ]
  })

  return { topics, lessons }
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

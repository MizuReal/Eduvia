import { z } from 'zod'
import {
  LESSON_TITLE_MAX_LENGTH,
  LESSON_TITLE_MIN_LENGTH,
  TOPIC_TITLE_MAX_LENGTH,
  TOPIC_TITLE_MIN_LENGTH,
} from '../config/constants.js'

const topicTitleSchema = z
  .string()
  .trim()
  .min(
    TOPIC_TITLE_MIN_LENGTH,
    `Use ${TOPIC_TITLE_MIN_LENGTH}–${TOPIC_TITLE_MAX_LENGTH} characters.`,
  )
  .max(
    TOPIC_TITLE_MAX_LENGTH,
    `Use ${TOPIC_TITLE_MIN_LENGTH}–${TOPIC_TITLE_MAX_LENGTH} characters.`,
  )

const lessonTitleSchema = z
  .string()
  .trim()
  .min(
    LESSON_TITLE_MIN_LENGTH,
    `Use ${LESSON_TITLE_MIN_LENGTH}–${LESSON_TITLE_MAX_LENGTH} characters.`,
  )
  .max(
    LESSON_TITLE_MAX_LENGTH,
    `Use ${LESSON_TITLE_MIN_LENGTH}–${LESSON_TITLE_MAX_LENGTH} characters.`,
  )

export const courseIdParamSchema = z.object({
  courseId: z.string().uuid('Select a valid subject.'),
})

export const topicIdParamSchema = z.object({
  topicId: z.string().uuid('Select a valid topic.'),
})

export const lessonIdParamSchema = z.object({
  lessonId: z.string().uuid('Select a valid lesson.'),
})

export const createTopicSchema = z.strictObject({
  title: topicTitleSchema,
})

export const createLessonSchema = z.strictObject({
  topicId: z.string().uuid('Select a topic.'),
  title: lessonTitleSchema,
})

export const updateTopicSchema = z.strictObject({
  title: topicTitleSchema,
})

export const updateLessonSchema = z
  .strictObject({
    title: lessonTitleSchema.optional(),
    topicId: z.string().uuid('Select a topic.').optional(),
  })
  .refine((value) => value.title !== undefined || value.topicId !== undefined, {
    message: 'Provide a lesson title, a topic, or both.',
    path: ['title'],
  })

export const reorderTopicsSchema = z.strictObject({
  topicIds: z
    .array(z.string().uuid('Select a valid topic.'))
    .min(1, 'At least one topic is required.'),
})

export const reorderLessonsSchema = z.strictObject({
  lessonIds: z
    .array(z.string().uuid('Select a valid lesson.'))
    .min(1, 'At least one lesson is required.'),
})

export type CreateTopicInput = z.infer<typeof createTopicSchema>
export type CreateLessonInput = z.infer<typeof createLessonSchema>
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>
export type ReorderTopicsInput = z.infer<typeof reorderTopicsSchema>
export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>

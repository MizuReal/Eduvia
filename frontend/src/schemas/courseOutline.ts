import { z } from 'zod'
import {
  LESSON_TITLE_MAX_LENGTH,
  LESSON_TITLE_MIN_LENGTH,
  TOPIC_TITLE_MAX_LENGTH,
  TOPIC_TITLE_MIN_LENGTH,
} from '../config/course'

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

export const createTopicSchema = z.strictObject({
  title: topicTitleSchema,
})

export const createLessonSchema = z.strictObject({
  topicId: z.string().uuid('Select a topic.'),
  title: lessonTitleSchema,
})

export type CreateTopicValues = z.infer<typeof createTopicSchema>
export type CreateLessonValues = z.infer<typeof createLessonSchema>

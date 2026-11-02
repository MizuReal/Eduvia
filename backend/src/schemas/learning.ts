import { z } from 'zod'

export const slideSourceSchema = z.enum(['upload', 'slides'])

export const recordSlideProgressSchema = z.strictObject({
  source: slideSourceSchema,
  slideIndex: z.number().int().min(0),
})

export const attemptIdParamSchema = z.object({
  attemptId: z.string().uuid('Select a valid quiz attempt.'),
})

export const saveAttemptAnswersSchema = z.strictObject({
  answers: z.array(
    z.strictObject({
      questionId: z.string().uuid('Select a valid question.'),
      selectedOption: z.enum(['A', 'B', 'C', 'D']),
    }),
  ),
})

export type RecordSlideProgressInput = z.infer<
  typeof recordSlideProgressSchema
>
export type SaveAttemptAnswersInput = z.infer<
  typeof saveAttemptAnswersSchema
>

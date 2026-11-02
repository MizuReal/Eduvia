import { z } from 'zod'
import {
  MAX_QUIZ_QUESTIONS,
  MIN_QUIZ_QUESTIONS,
  QUIZ_EXPLANATION_MAX_LENGTH,
  QUIZ_INSTRUCTIONS_MAX_LENGTH,
  QUIZ_OPTION_MAX_LENGTH,
  QUIZ_PROMPT_MAX_LENGTH,
  QUIZ_PROMPT_MIN_LENGTH,
} from '../config/constants.js'

export const quizIdParamSchema = z.object({
  quizId: z.string().uuid('Select a valid quiz.'),
})

const quizTitleSchema = z
  .string()
  .trim()
  .min(2, 'Use 2–160 characters.')
  .max(160, 'Use 2–160 characters.')

const optionSchema = z
  .string()
  .trim()
  .min(1, 'Every option needs text.')
  .max(QUIZ_OPTION_MAX_LENGTH, 'Use 500 characters or fewer.')

export const createQuizSchema = z.strictObject({
  mode: z.enum(['native', 'document']),
})

export const nativeQuestionSchema = z
  .strictObject({
    prompt: z
      .string()
      .trim()
      .min(QUIZ_PROMPT_MIN_LENGTH, 'Use 2–2,000 characters.')
      .max(QUIZ_PROMPT_MAX_LENGTH, 'Use 2–2,000 characters.'),
    optionA: optionSchema,
    optionB: optionSchema,
    optionC: optionSchema,
    optionD: optionSchema,
    correctOption: z.enum(['A', 'B', 'C', 'D']),
    explanation: z
      .string()
      .trim()
      .max(QUIZ_EXPLANATION_MAX_LENGTH)
      .nullable()
      .optional(),
  })
  .superRefine((value, context) => {
    const options = [
      value.optionA.toLowerCase(),
      value.optionB.toLowerCase(),
      value.optionC.toLowerCase(),
      value.optionD.toLowerCase(),
    ]

    if (new Set(options).size !== options.length) {
      context.addIssue({
        code: 'custom',
        message: 'Options must be unique.',
        path: ['optionA'],
      })
    }
  })

export const saveQuizSchema = z
  .strictObject({
    title: quizTitleSchema,
    instructions: z.string().trim().max(QUIZ_INSTRUCTIONS_MAX_LENGTH),
    passingScore: z.number().int().min(0).max(100),
    questions: z.array(nativeQuestionSchema).max(MAX_QUIZ_QUESTIONS).optional(),
    answers: z
      .array(z.enum(['A', 'B', 'C', 'D']))
      .min(MIN_QUIZ_QUESTIONS)
      .max(MAX_QUIZ_QUESTIONS)
      .optional(),
  })
  .refine(
    (value) => value.questions !== undefined || value.answers !== undefined,
    {
      message: 'Provide quiz questions or an answer key.',
      path: ['questions'],
    },
  )

export const previewGradeSchema = z.strictObject({
  answers: z
    .array(z.enum(['A', 'B', 'C', 'D']))
    .min(1)
    .max(MAX_QUIZ_QUESTIONS),
})

export type CreateQuizInput = z.infer<typeof createQuizSchema>
export type NativeQuestionInput = z.infer<typeof nativeQuestionSchema>
export type SaveQuizInput = z.infer<typeof saveQuizSchema>
export type PreviewGradeInput = z.infer<typeof previewGradeSchema>

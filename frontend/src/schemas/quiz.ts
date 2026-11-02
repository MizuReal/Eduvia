import { z } from 'zod'
import {
  MAX_QUIZ_QUESTIONS,
  MIN_QUIZ_QUESTIONS,
  QUIZ_EXPLANATION_MAX_LENGTH,
  QUIZ_INSTRUCTIONS_MAX_LENGTH,
  QUIZ_OPTION_MAX_LENGTH,
  QUIZ_PROMPT_MAX_LENGTH,
  QUIZ_PROMPT_MIN_LENGTH,
} from '../config/quiz'

const answerOptionFormSchema = z
  .string()
  .trim()
  .refine(
    (value) => ['A', 'B', 'C', 'D'].includes(value),
    'Choose the correct answer.',
  )

const quizTitleSchema = z
  .string()
  .trim()
  .min(2, 'Use 2–160 characters.')
  .max(160, 'Use 2–160 characters.')

const quizSettingsShape = {
  title: quizTitleSchema,
  instructions: z.string().trim().max(QUIZ_INSTRUCTIONS_MAX_LENGTH),
  passingScore: z.number().int().min(0).max(100),
}

const optionSchema = z
  .string()
  .trim()
  .min(1, 'Every option needs text.')
  .max(QUIZ_OPTION_MAX_LENGTH, 'Use 500 characters or fewer.')

export const nativeQuestionFormSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(QUIZ_PROMPT_MIN_LENGTH, 'Use 2–2,000 characters.')
      .max(QUIZ_PROMPT_MAX_LENGTH, 'Use 2–2,000 characters.'),
    optionA: optionSchema,
    optionB: optionSchema,
    optionC: optionSchema,
    optionD: optionSchema,
    correctOption: answerOptionFormSchema,
    explanation: z
      .string()
      .trim()
      .max(QUIZ_EXPLANATION_MAX_LENGTH, 'Use 2,000 characters or fewer.'),
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

export const nativeQuizFormSchema = z.object({
  ...quizSettingsShape,
  questions: z.array(nativeQuestionFormSchema).max(MAX_QUIZ_QUESTIONS),
})

export const documentQuizFormSchema = z.object({
  ...quizSettingsShape,
  answers: z
    .array(z.object({ correctOption: answerOptionFormSchema }))
    .min(MIN_QUIZ_QUESTIONS)
    .max(MAX_QUIZ_QUESTIONS),
})

export type NativeQuizFormValues = z.infer<typeof nativeQuizFormSchema>
export type DocumentQuizFormValues = z.infer<typeof documentQuizFormSchema>
export type NativeQuestionFormValues = z.infer<
  typeof nativeQuestionFormSchema
>

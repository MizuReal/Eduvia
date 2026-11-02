import { z } from 'zod'
import {
  FACULTIES,
  NAME_MAX_LENGTH,
  NAME_PATTERN,
  PASSWORD_PATTERN,
  REGISTRATION_ROLES,
  USERNAME_PATTERN,
} from '../config/constants.js'

export const usernameSchema = z
  .string()
  .trim()
  .regex(
    USERNAME_PATTERN,
    'Use the format TUPT-XX-XXXX, where every X is a number.',
  )
  .transform((value) => value.toLowerCase())

export const passwordSchema = z
  .string()
  .regex(
    PASSWORD_PATTERN,
    'Use 8–72 characters with uppercase, lowercase, number, and symbol, and no spaces.',
  )

export const facultySchema = z.enum(FACULTIES, {
  message: 'Select your faculty.',
})

const NAME_MESSAGE =
  'Use letters, spaces, apostrophes, hyphens, or periods only.'

function requiredNameSchema(label: string) {
  return z
    .string()
    .trim()
    .min(1, `Enter your ${label}.`)
    .max(NAME_MAX_LENGTH, `Use ${NAME_MAX_LENGTH} characters or fewer.`)
    .regex(NAME_PATTERN, NAME_MESSAGE)
    .transform((value) => value.replace(/\s+/g, ' '))
}

export const registerSchema = z
  .strictObject({
    role: z.enum(REGISTRATION_ROLES, {
      message: 'Choose Student or Teacher.',
    }),
    firstName: requiredNameSchema('first name'),
    middleName: requiredNameSchema('middle name'),
    lastName: requiredNameSchema('last name'),
    username: usernameSchema,
    password: passwordSchema,
    faculty: facultySchema,
    teacherAccessCode: z.string().trim().max(200).optional(),
    tosAccepted: z
      .boolean()
      .refine(
        (value) => value === true,
        'Accept the privacy notice to continue.',
      ),
  })
  .superRefine((value, context) => {
    if (value.role === 'instructor' && !value.teacherAccessCode) {
      context.addIssue({
        code: 'custom',
        path: ['teacherAccessCode'],
        message: 'Enter the teacher access code.',
      })
    }
  })

export type RegisterInput = z.infer<typeof registerSchema>

import { z } from 'zod'
import {
  FACULTIES,
  LOGIN_USERNAME_PATTERN,
  NAME_MAX_LENGTH,
  NAME_PATTERN,
  REGISTRATION_ROLES,
  TUPT_USERNAME_PATTERN,
} from '../config/auth'

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(
      LOGIN_USERNAME_PATTERN,
      'Enter a valid TUPT username or your existing Eduvia username.',
    )
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Enter your password.'),
})

export const registerUsernameSchema = z
  .string()
  .trim()
  .regex(
    TUPT_USERNAME_PATTERN,
    'Use the format TUPT-XX-XXXX, where every X is a number.',
  )
  .transform((value) => value.toUpperCase())

const PASSWORD_PATTERN =
  /^(?=\S{8,72}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/

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
    username: registerUsernameSchema,
    password: z
      .string()
      .regex(
        PASSWORD_PATTERN,
        'Use 8–72 characters with uppercase, lowercase, number, and symbol, and no spaces.',
      ),
    faculty: z.enum(FACULTIES, { message: 'Select your faculty.' }),
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

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>

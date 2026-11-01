import { z } from 'zod'
import { FACULTIES, PASSWORD_PATTERN, USERNAME_PATTERN } from '../config/constants.js'

export const usernameSchema = z
  .string()
  .trim()
  .regex(
    USERNAME_PATTERN,
    'Use 3–20 characters, start with a letter, and use only letters, numbers, or underscores.',
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

export const registerSchema = z.strictObject({
  username: usernameSchema,
  password: passwordSchema,
  faculty: facultySchema,
  tosAccepted: z
    .boolean()
    .refine((value) => value === true, 'Accept the privacy notice to continue.'),
})

export type RegisterInput = z.infer<typeof registerSchema>

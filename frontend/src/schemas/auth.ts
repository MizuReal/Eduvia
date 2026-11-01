import { z } from 'zod'
import { FACULTIES } from '../config/auth'

export const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{2,19}$/
export const PASSWORD_PATTERN =
  /^(?=\S{8,72}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/

const usernameSchema = z
  .string()
  .trim()
  .regex(
    USERNAME_PATTERN,
    'Use 3–20 characters, start with a letter, and use only letters, numbers, or underscores.',
  )
  .transform((value) => value.toLowerCase())

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Enter your password.'),
})

export const registerSchema = z.strictObject({
  username: usernameSchema,
  password: z
    .string()
    .regex(
      PASSWORD_PATTERN,
      'Use 8–72 characters with uppercase, lowercase, number, and symbol, and no spaces.',
    ),
  faculty: z.enum(FACULTIES, { message: 'Select your faculty.' }),
  tosAccepted: z
    .boolean()
    .refine((value) => value === true, 'Accept the privacy notice to continue.'),
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>

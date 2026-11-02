import { timingSafeEqual } from 'node:crypto'
import {
  AUTH_EMAIL_DOMAIN,
  CURRENT_TOS_VERSION,
} from '../config/constants.js'
import { env } from '../config/env.js'
import { createProfile, findProfileByUsername } from '../db/profiles.js'
import { supabaseAdmin } from '../db/supabaseAdmin.js'
import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import type { RegisterInput } from '../schemas/auth.js'

export type RegisteredUser = {
  id: string
  username: string
  email: string
  firstName: string
  middleName: string
  lastName: string
  role: RegisterInput['role']
  faculty: RegisterInput['faculty']
  tosAcceptedAt: string
}

function toAuthEmail(username: string): string {
  return `${username}@${AUTH_EMAIL_DOMAIN}`
}

function assertTeacherAccessCode(code: string | undefined): void {
  const expected = env.TEACHER_REGISTRATION_CODE

  if (!expected) {
    throw new AppError(
      403,
      'TEACHER_REGISTRATION_DISABLED',
      'Teacher registration is not available right now.',
      [
        {
          path: 'teacherAccessCode',
          message: 'Teacher registration is not available right now.',
        },
      ],
    )
  }

  const providedBuffer = Buffer.from(code ?? '')
  const expectedBuffer = Buffer.from(expected)
  const matches =
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)

  if (!matches) {
    throw new AppError(
      403,
      'INVALID_TEACHER_CODE',
      'The teacher access code is invalid.',
      [
        {
          path: 'teacherAccessCode',
          message: 'The teacher access code is invalid.',
        },
      ],
    )
  }
}

export async function registerUser(
  input: RegisterInput,
): Promise<RegisteredUser> {
  // The client's role choice is only trusted for students. Instructor access
  // is authorized by the backend-only registration code.
  if (input.role === 'instructor') {
    assertTeacherAccessCode(input.teacherAccessCode)
  }

  const existingProfile = await findProfileByUsername(input.username)

  if (existingProfile) {
    throw new AppError(409, 'USERNAME_TAKEN', 'That username is already taken.')
  }

  const email = toAuthEmail(input.username)
  const tosAcceptedAt = new Date().toISOString()

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      username: input.username,
      first_name: input.firstName,
      middle_name: input.middleName,
      last_name: input.lastName,
      role: input.role,
      faculty: input.faculty,
      tos_version: CURRENT_TOS_VERSION,
      tos_accepted_at: tosAcceptedAt,
    },
  })

  if (error) {
    if (error.code === 'email_exists') {
      throw new AppError(409, 'USERNAME_TAKEN', 'That username is already taken.')
    }

    if (error.code === 'weak_password') {
      throw new AppError(400, 'WEAK_PASSWORD', 'Choose a stronger password.')
    }

    logger.warn(
      { code: error.code, status: error.status },
      'Supabase user creation failed',
    )
    throw new AppError(502, 'AUTH_PROVIDER_ERROR', 'We could not create your account. Try again.')
  }

  const userId = data.user?.id

  if (!userId) {
    logger.error('Supabase user creation returned no user id')
    throw new AppError(502, 'AUTH_PROVIDER_ERROR', 'We could not create your account. Try again.')
  }

  try {
    await createProfile({
      id: userId,
      username: input.username,
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      faculty: input.faculty,
      role: input.role,
      tosVersion: CURRENT_TOS_VERSION,
      tosAcceptedAt,
    })
  } catch (profileError) {
    logger.error({ err: profileError, userId }, 'Profile creation failed; rolling back auth user')

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      logger.error({ err: deleteError, userId }, 'Failed to roll back auth user')
    }

    if (profileError instanceof AppError && profileError.code === 'USERNAME_TAKEN') {
      throw profileError
    }

    throw new AppError(500, 'PROFILE_CREATION_FAILED', 'We could not finish creating your account. Try again.')
  }

  return {
    id: userId,
    username: input.username,
    email,
    firstName: input.firstName,
    middleName: input.middleName,
    lastName: input.lastName,
    role: input.role,
    faculty: input.faculty,
    tosAcceptedAt,
  }
}

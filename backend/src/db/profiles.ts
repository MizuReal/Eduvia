import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import { supabaseAdmin } from './supabaseAdmin.js'
import type { ProfileRow } from './database.types.js'
import type { Faculty } from '../types/auth.js'

export type CreateProfileInput = {
  id: string
  username: string
  faculty: Faculty
  tosVersion: string
  tosAcceptedAt: string
}

export async function findProfileByUsername(
  username: string,
): Promise<{ id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, username }, 'Profile lookup by username failed')
    throw new AppError(503, 'PROFILE_LOOKUP_FAILED', 'Please try again.')
  }

  return data
}

export async function findProfileById(id: string): Promise<ProfileRow | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, userId: id }, 'Profile lookup by id failed')
    throw new AppError(503, 'PROFILE_LOOKUP_FAILED', 'Please try again.')
  }

  return data
}

export async function createProfile(input: CreateProfileInput): Promise<void> {
  const { error } = await supabaseAdmin.from('profiles').insert({
    id: input.id,
    username: input.username,
    faculty: input.faculty,
    role: 'student',
    tos_version: input.tosVersion,
    tos_accepted_at: input.tosAcceptedAt,
  })

  if (!error) {
    return
  }

  if (error.code === '23505') {
    throw new AppError(409, 'USERNAME_TAKEN', 'That username is already taken.')
  }

  logger.error({ err: error, userId: input.id }, 'Profile creation failed')
  throw new AppError(500, 'PROFILE_CREATION_FAILED', 'We could not finish creating your account. Try again.')
}

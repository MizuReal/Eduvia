import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'
import { supabaseAdmin } from './supabaseAdmin.js'
import type { ProfileRow } from './database.types.js'
import type { Faculty } from '../types/auth.js'

export type CreateProfileInput = {
  id: string
  username: string
  firstName: string
  middleName: string
  lastName: string
  faculty: Faculty
  role: 'student' | 'instructor'
  tosVersion: string
  tosAcceptedAt: string
}

export type StudentNameProfile = {
  id: string
  username: string
  firstName: string
  lastName: string
  faculty: Faculty
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

export async function listStudentNamesByIds(
  studentIds: string[],
): Promise<Map<string, StudentNameProfile>> {
  if (studentIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username, first_name, last_name, faculty')
    .in('id', studentIds)
    .is('deleted_at', null)

  if (error) {
    logger.error({ err: error }, 'Student name lookup failed')
    throw new AppError(
      503,
      'PROFILE_LOOKUP_FAILED',
      'We could not load the student list. Try again.',
    )
  }

  return new Map(
    (data ?? []).map((row) => [
      row.id,
      {
        id: row.id,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        faculty: row.faculty,
      },
    ]),
  )
}

export async function createProfile(input: CreateProfileInput): Promise<void> {
  const { error } = await supabaseAdmin.from('profiles').insert({
    id: input.id,
    username: input.username,
    first_name: input.firstName,
    middle_name: input.middleName,
    last_name: input.lastName,
    faculty: input.faculty,
    role: input.role,
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

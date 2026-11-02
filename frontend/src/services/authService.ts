import type { Session } from '@supabase/supabase-js'
import { AUTH_EMAIL_DOMAIN } from '../config/auth'
import type { AuthProfile, Faculty } from '../types/auth'
import { get, post } from './apiClient'
import { clearResponseCache } from './responseCache'
import { AuthError } from './authErrors'
import { supabase } from './supabaseClient'

export type RegisterInput = {
  username: string
  password: string
  faculty: Faculty
  tosAccepted: true
}

type RegisterResponse = {
  id: string
  username: string
  email: string
  faculty: Faculty
  tosAcceptedAt: string
}

export function usernameToAuthEmail(username: string): string {
  return `${username.toLowerCase()}@${AUTH_EMAIL_DOMAIN}`
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new AuthError('SESSION_ERROR', 'We could not restore your session.')
  }

  return data.session
}

export function onAuthStateChange(
  callback: (session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })

  return () => data.subscription.unsubscribe()
}

export async function signIn(
  username: string,
  password: string,
): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToAuthEmail(username),
    password,
  })

  if (!error) {
    return
  }

  if (error.code === 'invalid_credentials' || error.status === 400) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid username or password.')
  }

  throw new AuthError('SIGN_IN_FAILED', 'We could not sign you in. Try again.')
}

export async function register(input: RegisterInput): Promise<void> {
  const response = await post<RegisterResponse>('/api/auth/register', input)
  const { error } = await supabase.auth.signInWithPassword({
    email: response.email,
    password: input.password,
  })

  if (error) {
    throw new AuthError(
      'ACCOUNT_CREATED_SIGN_IN_FAILED',
      'Account created. Sign in with your new credentials.',
    )
  }
}

export async function signOut(): Promise<void> {
  clearResponseCache()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new AuthError('SIGN_OUT_FAILED', 'We could not sign you out. Try again.')
  }
}

export async function getProfile(accessToken: string): Promise<AuthProfile> {
  return get<AuthProfile>('/api/users/me', accessToken)
}

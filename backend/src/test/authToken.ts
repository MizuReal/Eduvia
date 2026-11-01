import { SignJWT } from 'jose'
import { env } from '../config/env.js'

export async function signTestToken(userId = 'user-1'): Promise<string> {
  if (!env.SUPABASE_JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET is required for backend tests')
  }

  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(`${env.SUPABASE_URL}/auth/v1`)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(env.SUPABASE_JWT_SECRET))
}

import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'
import { env } from '../config/env.js'
import { AppError } from '../errors/AppError.js'

const issuer = `${env.SUPABASE_URL}/auth/v1`
const jwtSecret = env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(env.SUPABASE_JWT_SECRET)
  : null
const jwks = jwtSecret
  ? null
  : createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))

function requireSubject(payload: JWTPayload): string {
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('Missing JWT subject')
  }

  return payload.sub
}

export async function verifyAccessToken(token: string): Promise<string> {
  if (jwtSecret) {
    try {
      const { payload } = await jwtVerify(token, jwtSecret, {
        issuer,
        audience: 'authenticated',
        algorithms: ['HS256'],
      })

      return requireSubject(payload)
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Authentication required.')
    }
  }

  if (!jwks) {
    throw new AppError(500, 'AUTH_CONFIGURATION_ERROR', 'Authentication is not configured.')
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: 'authenticated',
      algorithms: ['ES256', 'RS256'],
    })

    return requireSubject(payload)
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Authentication required.')
  }
}

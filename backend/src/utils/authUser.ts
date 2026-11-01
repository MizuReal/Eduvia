import type { Request } from 'express'
import { AppError } from '../errors/AppError.js'
import type { AuthenticatedUser } from '../types/auth.js'

export function requireAuthenticatedUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required.')
  }

  return req.user
}

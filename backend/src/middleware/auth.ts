import type { NextFunction, Request, Response } from 'express'
import { findProfileById } from '../db/profiles.js'
import { AppError } from '../errors/AppError.js'
import { verifyAccessToken } from '../lib/jwt.js'

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.header('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required.')
  }

  const token = authorization.slice('Bearer '.length).trim()

  if (!token) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required.')
  }

  const userId = await verifyAccessToken(token)
  const profile = await findProfileById(userId)

  if (!profile || profile.deleted_at) {
    throw new AppError(401, 'ACCOUNT_NOT_FOUND', 'Authentication required.')
  }

  req.user = {
    id: profile.id,
    username: profile.username,
    role: profile.role,
    faculty: profile.faculty,
  }

  next()
}

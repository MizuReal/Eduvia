import type { Request, Response } from 'express'
import { AppError } from '../errors/AppError.js'

export function getCurrentUser(req: Request, res: Response): void {
  const user = req.user

  if (!user) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required.')
  }

  res.status(200).json({ data: user, error: null })
}

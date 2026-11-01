import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../errors/AppError.js'
import type { UserRole } from '../types/auth.js'

export function requireRole(...roles: readonly UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required.')
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You do not have access to this action.',
      )
    }

    next()
  }
}

import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../errors/AppError.js'
import { logger } from '../logger.js'

function isJsonParseError(error: unknown): boolean {
  if (!(error instanceof SyntaxError)) {
    return false
  }

  return (
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number' &&
    (error as { status: number }).status === 400
  )
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error)
    return
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      data: null,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    })
    return
  }

  if (isJsonParseError(error)) {
    res.status(400).json({
      data: null,
      error: {
        code: 'INVALID_JSON',
        message: 'The request body must be valid JSON.',
      },
    })
    return
  }

  logger.error({ err: error }, 'Unhandled request error')
  res.status(500).json({
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong.',
    },
  })
}

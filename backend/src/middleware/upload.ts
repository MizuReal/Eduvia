import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { UPLOAD_FIELD_NAME } from '../config/constants.js'
import { env } from '../config/env.js'
import { AppError } from '../errors/AppError.js'

mkdirSync(env.UPLOAD_TEMP_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: env.UPLOAD_TEMP_DIR,
  filename: (_req, _file, callback) => {
    callback(null, randomUUID())
  },
})

const multipartUpload = multer({
  storage,
  limits: {
    fileSize: env.DOCUMENT_MAX_BYTES,
    files: 1,
    fields: 3,
    parts: 5,
    fieldSize: 2 * 1024,
  },
})

function translateMulterError(error: unknown): AppError {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new AppError(
        413,
        'FILE_TOO_LARGE',
        'That file is larger than the allowed limit.',
      )
    }

    return new AppError(
      400,
      'INVALID_UPLOAD',
      'That upload could not be accepted. Try again.',
    )
  }

  if (error instanceof AppError) {
    return error
  }

  return new AppError(400, 'INVALID_UPLOAD', 'That upload could not be accepted.')
}

export function acceptSingleFile(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  multipartUpload.single(UPLOAD_FIELD_NAME)(req, res, (error: unknown) => {
    if (error) {
      next(translateMulterError(error))
      return
    }

    next()
  })
}

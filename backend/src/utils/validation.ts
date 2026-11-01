import type { ZodError } from 'zod'
import type { ErrorDetail } from '../errors/AppError.js'

export function formatZodError(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.map((segment) => String(segment)).join('.'),
    message: issue.message,
  }))
}

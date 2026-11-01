export type ErrorDetail = {
  path: string
  message: string
}

export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details: readonly ErrorDetail[] | undefined

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: readonly ErrorDetail[],
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

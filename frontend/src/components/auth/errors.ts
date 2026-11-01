import { ApiError } from '../../services/apiClient'
import { AuthError } from '../../services/authErrors'

export function messageForAuthError(error: unknown): string {
  if (error instanceof AuthError) {
    return error.message
  }

  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMITED') {
      return 'Too many attempts. Try again later.'
    }

    return error.message
  }

  return 'Something went wrong. Try again.'
}

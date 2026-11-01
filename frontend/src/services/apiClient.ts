const configuredApiUrl = import.meta.env.VITE_API_URL
const API_BASE_URL =
  typeof configuredApiUrl === 'string'
    ? configuredApiUrl.replace(/\/+$/, '')
    : ''

if (!API_BASE_URL) {
  throw new Error('VITE_API_URL is missing. Fill frontend/.env.')
}

const REQUEST_TIMEOUT_MS = 15_000

export type ApiErrorDetail = {
  path: string
  message: string
}

type ApiSuccess<T> = {
  data: T
  error: null
}

type ApiFailure = {
  data: null
  error: {
    code: string
    message: string
    details?: ApiErrorDetail[]
  }
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details: ApiErrorDetail[] | undefined

  constructor(
    code: string,
    message: string,
    status: number,
    details?: ApiErrorDetail[],
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

function isApiFailure(payload: unknown): payload is ApiFailure {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('error' in payload)
  ) {
    return false
  }

  const error = (payload as { error: unknown }).error

  if (typeof error !== 'object' || error === null) {
    return false
  }

  const record = error as Record<string, unknown>

  return typeof record.code === 'string' && typeof record.message === 'string'
}

function isApiSuccess<T>(payload: unknown): payload is ApiSuccess<T> {
  if (typeof payload !== 'object' || payload === null) {
    return false
  }

  const record = payload as Record<string, unknown>

  return 'data' in record && record.error === null
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const headers = new Headers(init.headers)
    headers.set('Content-Type', 'application/json')

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    })
    const payload: unknown = await response.json()

    if (isApiFailure(payload)) {
      throw new ApiError(
        payload.error.code,
        payload.error.message,
        response.status,
        payload.error.details,
      )
    }

    if (!response.ok) {
      throw new ApiError('HTTP_ERROR', 'Something went wrong.', response.status)
    }

    if (!isApiSuccess<T>(payload)) {
      throw new ApiError(
        'INVALID_RESPONSE',
        'Something went wrong.',
        response.status,
      )
    }

    return payload.data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('TIMEOUT', 'The request timed out. Try again.', 0)
    }

    throw new ApiError(
      'NETWORK_ERROR',
      'We could not reach the server. Try again.',
      0,
    )
  } finally {
    clearTimeout(timeout)
  }
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function postAuth<T>(
  path: string,
  body: unknown,
  accessToken: string,
): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })
}

export function get<T>(path: string, accessToken: string): Promise<T> {
  return request<T>(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
}

import { UPLOAD_TIMEOUT_MS } from '../config/content'
import { API_BASE_URL, ApiError, parseApiResponse } from './apiClient'

export type UploadRequestOptions = {
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

export function uploadMultipart<T>(
  path: string,
  formData: FormData,
  accessToken: string,
  options: UploadRequestOptions = {},
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new ApiError('UPLOAD_CANCELLED', 'Upload cancelled.', 0))
      return
    }

    const xhr = new XMLHttpRequest()
    let settled = false

    const cleanup = () => {
      options.signal?.removeEventListener('abort', handleAbort)
    }

    const fail = (error: ApiError) => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      reject(error)
    }

    const succeed = (value: T) => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      resolve(value)
    }

    const handleAbort = () => {
      xhr.abort()
    }

    xhr.open('POST', `${API_BASE_URL}${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.timeout = UPLOAD_TIMEOUT_MS

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || settled) {
        return
      }

      const percent = Math.min(
        100,
        Math.max(0, Math.round((event.loaded / event.total) * 100)),
      )
      options.onProgress?.(percent)
    }

    xhr.onload = () => {
      let payload: unknown

      try {
        payload = JSON.parse(xhr.responseText)
      } catch {
        fail(
          new ApiError(
            'INVALID_RESPONSE',
            'The server returned an unexpected response.',
            xhr.status,
          ),
        )
        return
      }

      try {
        succeed(parseApiResponse<T>(payload, xhr.status))
      } catch (error) {
        fail(
          error instanceof ApiError
            ? error
            : new ApiError('INVALID_RESPONSE', 'Something went wrong.', xhr.status),
        )
      }
    }

    xhr.onerror = () => {
      fail(
        new ApiError(
          'NETWORK_ERROR',
          'We could not reach the server. Try again.',
          0,
        ),
      )
    }

    xhr.ontimeout = () => {
      fail(new ApiError('TIMEOUT', 'The upload timed out. Try again.', 0))
    }

    xhr.onabort = () => {
      fail(new ApiError('UPLOAD_CANCELLED', 'Upload cancelled.', 0))
    }

    options.signal?.addEventListener('abort', handleAbort, { once: true })
    xhr.send(formData)
  })
}

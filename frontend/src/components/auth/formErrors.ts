import type { ZodError } from 'zod'
import type { ApiError } from '../../services/apiClient'

export type FieldErrors = Record<string, string>

export function fieldErrorsFromZod(error: ZodError): FieldErrors {
  const errors: FieldErrors = {}

  for (const issue of error.issues) {
    const field = issue.path[0]

    if (field !== undefined && !errors[String(field)]) {
      errors[String(field)] = issue.message
    }
  }

  return errors
}

export function fieldErrorsFromApi(error: ApiError): FieldErrors {
  const errors: FieldErrors = {}

  for (const detail of error.details ?? []) {
    if (detail.path && !errors[detail.path]) {
      errors[detail.path] = detail.message
    }
  }

  return errors
}

export function firstInvalidField(error: ZodError): string | undefined {
  const field = error.issues[0]?.path[0]
  return field === undefined ? undefined : String(field)
}

export function focusField(
  form: HTMLFormElement | null,
  fieldName: string | undefined,
): void {
  if (!form || !fieldName) {
    return
  }

  form.querySelector<HTMLElement>(`[name="${fieldName}"]`)?.focus()
}

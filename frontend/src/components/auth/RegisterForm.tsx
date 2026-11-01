import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { CURRENT_TOS_VERSION, FACULTY_OPTIONS } from '../../config/auth'
import { registerSchema } from '../../schemas/auth'
import { ApiError } from '../../services/apiClient'
import { register } from '../../services/authService'
import { Button } from '../ui/Button'
import { messageForAuthError } from './errors'
import { FieldError } from './FieldError'
import { FormAlert } from './FormAlert'
import {
  fieldErrorsFromApi,
  fieldErrorsFromZod,
  firstInvalidField,
  focusField,
} from './formErrors'
import type { FieldErrors } from './formErrors'
import {
  CHECKBOX_CLASSES,
  FIELD_HINT_CLASSES,
  FIELD_INPUT_CLASSES,
  FIELD_LABEL_CLASSES,
} from './formStyles'

type RegisterFormProps = {
  onSuccess: () => void
}

type RegisterFormValues = {
  username: string
  password: string
  faculty: string
  tosAccepted: boolean
}

const PRIVACY_NOTICE =
  'Eduvia stores your username, faculty, and learning activity to run your account and show your progress. Your password is managed by Supabase Auth and is never stored in the application database. We do not sell personal data; administrators may update or remove accounts under school policy.'

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [values, setValues] = useState<RegisterFormValues>({
    username: '',
    password: '',
    faculty: '',
    tosAccepted: false,
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const clearFieldError = (field: keyof RegisterFormValues) => {
    setErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
    setServerError(null)
  }

  const handleTextChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const field = event.target.name

    if (field !== 'username' && field !== 'password' && field !== 'faculty') {
      return
    }

    setValues((current) => ({ ...current, [field]: event.target.value }))
    clearFieldError(field)
  }

  const handleTosChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, tosAccepted: event.target.checked }))
    clearFieldError('tosAccepted')
  }

  const applyServerError = (error: ApiError) => {
    const apiErrors = fieldErrorsFromApi(error)

    if (error.code === 'USERNAME_TAKEN') {
      setErrors({ username: error.message })
      focusField(formRef.current, 'username')
      setServerError(error.message)
      return
    }

    if (error.code === 'VALIDATION_ERROR' && Object.keys(apiErrors).length > 0) {
      setErrors(apiErrors)
      focusField(formRef.current, Object.keys(apiErrors)[0])
      setServerError(error.message)
      return
    }

    setServerError(messageForAuthError(error))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const parsed = registerSchema.safeParse(values)

    if (!parsed.success) {
      setErrors(fieldErrorsFromZod(parsed.error))
      focusField(formRef.current, firstInvalidField(parsed.error))
      return
    }

    setIsSubmitting(true)
    setServerError(null)

    try {
      await register({
        username: parsed.data.username,
        password: parsed.data.password,
        faculty: parsed.data.faculty,
        tosAccepted: true,
      })
      setIsSubmitting(false)
      onSuccess()
    } catch (error) {
      if (error instanceof ApiError) {
        applyServerError(error)
      } else {
        setServerError(messageForAuthError(error))
      }

      setIsSubmitting(false)
    }
  }

  const usernameDescribedBy = errors.username
    ? 'register-username-hint register-username-error'
    : 'register-username-hint'
  const passwordDescribedBy = errors.password
    ? 'register-password-hint register-password-error'
    : 'register-password-hint'
  const tosDescribedBy = errors.tosAccepted
    ? 'register-tos-hint register-tos-error'
    : 'register-tos-hint'

  return (
    <form
      ref={formRef}
      noValidate
      aria-busy={isSubmitting}
      onSubmit={handleSubmit}
      className="mt-md space-y-md"
    >
      <FormAlert message={serverError} />

      <div>
        <label htmlFor="register-username" className={FIELD_LABEL_CLASSES}>
          Username
        </label>
        <input
          id="register-username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={values.username}
          onChange={handleTextChange}
          aria-invalid={Boolean(errors.username)}
          aria-describedby={usernameDescribedBy}
          className={FIELD_INPUT_CLASSES}
        />
        <p id="register-username-hint" className={FIELD_HINT_CLASSES}>
          3–20 characters, starting with a letter. Letters, numbers, and
          underscores only.
        </p>
        <FieldError id="register-username-error" message={errors.username} />
      </div>

      <div>
        <label htmlFor="register-password" className={FIELD_LABEL_CLASSES}>
          Password
        </label>
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={handleTextChange}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={passwordDescribedBy}
          className={FIELD_INPUT_CLASSES}
        />
        <p id="register-password-hint" className={FIELD_HINT_CLASSES}>
          8–72 characters with uppercase, lowercase, number, and symbol. No
          spaces.
        </p>
        <FieldError id="register-password-error" message={errors.password} />
      </div>

      <div>
        <label htmlFor="register-faculty" className={FIELD_LABEL_CLASSES}>
          Faculty
        </label>
        <select
          id="register-faculty"
          name="faculty"
          value={values.faculty}
          onChange={handleTextChange}
          aria-invalid={Boolean(errors.faculty)}
          aria-describedby={errors.faculty ? 'register-faculty-error' : undefined}
          className={FIELD_INPUT_CLASSES}
        >
          <option value="" disabled>
            Select your faculty
          </option>
          {FACULTY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FieldError id="register-faculty-error" message={errors.faculty} />
      </div>

      <div>
        <label
          htmlFor="register-tos"
          className="flex min-h-11 items-start gap-xs py-xxs text-body-sm text-ink"
        >
          <input
            id="register-tos"
            name="tosAccepted"
            type="checkbox"
            checked={values.tosAccepted}
            onChange={handleTosChange}
            aria-invalid={Boolean(errors.tosAccepted)}
            aria-describedby={tosDescribedBy}
            className={CHECKBOX_CLASSES}
          />
          <span>I agree to the privacy notice and terms of service.</span>
        </label>
        <details className="mt-xxs text-caption text-ink-muted">
          <summary className="min-h-11 cursor-pointer rounded-sm text-primary-active underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            Read the privacy notice (v{CURRENT_TOS_VERSION})
          </summary>
          <p id="register-tos-hint" className="mt-xxs">
            {PRIVACY_NOTICE}
          </p>
        </details>
        <FieldError id="register-tos-error" message={errors.tosAccepted} />
      </div>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}

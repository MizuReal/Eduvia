import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { loginSchema } from '../../schemas/auth'
import { signIn } from '../../services/authService'
import { Button } from '../ui/Button'
import { messageForAuthError } from './errors'
import { FieldError } from './FieldError'
import { FormAlert } from './FormAlert'
import {
  fieldErrorsFromZod,
  firstInvalidField,
  focusField,
} from './formErrors'
import type { FieldErrors } from './formErrors'
import { FIELD_INPUT_CLASSES, FIELD_LABEL_CLASSES } from './formStyles'

type LoginFormProps = {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [values, setValues] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name

    if (field !== 'username' && field !== 'password') {
      return
    }

    setValues((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
    setServerError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const parsed = loginSchema.safeParse(values)

    if (!parsed.success) {
      setErrors(fieldErrorsFromZod(parsed.error))
      focusField(formRef.current, firstInvalidField(parsed.error))
      return
    }

    setIsSubmitting(true)
    setServerError(null)

    try {
      await signIn(parsed.data.username, parsed.data.password)
      setIsSubmitting(false)
      onSuccess()
    } catch (error) {
      setServerError(messageForAuthError(error))
      setIsSubmitting(false)
    }
  }

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
        <label htmlFor="login-username" className={FIELD_LABEL_CLASSES}>
          Username
        </label>
        <input
          id="login-username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={values.username}
          onChange={handleChange}
          placeholder="TUPT-00-0000"
          aria-invalid={Boolean(errors.username)}
          aria-describedby={
            errors.username
              ? 'login-username-hint login-username-error'
              : 'login-username-hint'
          }
          className={FIELD_INPUT_CLASSES}
        />
        <p id="login-username-hint" className="mt-xxs text-caption text-ink-muted">
          Use your TUPT username or your existing Eduvia username.
        </p>
        <FieldError id="login-username-error" message={errors.username} />
      </div>

      <div>
        <label htmlFor="login-password" className={FIELD_LABEL_CLASSES}>
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={handleChange}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
          className={FIELD_INPUT_CLASSES}
        />
        <FieldError id="login-password-error" message={errors.password} />
      </div>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}

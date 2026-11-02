import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Eye, EyeOff, IdCard, LockKeyhole, LogIn } from 'lucide-react'
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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
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
          <span className="inline-flex items-center gap-xs">
            <span className="flex size-6 items-center justify-center rounded-md bg-accent-sky text-ink">
              <IdCard className="size-3.5" aria-hidden="true" />
            </span>
            Username
          </span>
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
          <span className="inline-flex items-center gap-xs">
            <span className="flex size-6 items-center justify-center rounded-md bg-accent-purple text-ink">
              <LockKeyhole className="size-3.5" aria-hidden="true" />
            </span>
            Password
          </span>
        </label>
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type={isPasswordVisible ? 'text' : 'password'}
            autoComplete="current-password"
            value={values.password}
            onChange={handleChange}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? 'login-password-error' : undefined
            }
            className={`${FIELD_INPUT_CLASSES} pr-12`}
          />
          <button
            type="button"
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-xs text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {isPasswordVisible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <FieldError id="login-password-error" message={errors.password} />
      </div>

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={isSubmitting}
      >
        <LogIn className="size-4" aria-hidden="true" />
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}

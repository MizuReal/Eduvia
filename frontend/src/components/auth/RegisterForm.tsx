import {
  Building2,
  GraduationCap,
  IdCard,
  KeyRound,
  LockKeyhole,
  Presentation,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  CURRENT_TOS_VERSION,
  FACULTY_OPTIONS,
  NAME_MAX_LENGTH,
} from '../../config/auth'
import { registerSchema } from '../../schemas/auth'
import { ApiError } from '../../services/apiClient'
import { register } from '../../services/authService'
import type { RegisterInput } from '../../services/authService'
import type { RegistrationRole } from '../../types/auth'
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
  role: RegistrationRole | ''
  firstName: string
  middleName: string
  lastName: string
  username: string
  password: string
  faculty: string
  teacherAccessCode: string
  tosAccepted: boolean
}

const TEXT_FIELDS = [
  'firstName',
  'middleName',
  'lastName',
  'username',
  'password',
  'faculty',
  'teacherAccessCode',
] as const

type TextField = (typeof TEXT_FIELDS)[number]

const PRIVACY_NOTICE =
  'Eduvia stores your name, username, faculty, role, and learning activity to run your account and show your progress. Your password is managed by Supabase Auth and is never stored in the application database. We do not sell personal data; administrators may update or remove accounts under school policy.'

function isTextField(value: string): value is TextField {
  return TEXT_FIELDS.some((field) => field === value)
}

function FieldLabelIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="size-4 text-ink-muted" aria-hidden="true" />
}

function RoleCard({
  value,
  title,
  description,
  icon: Icon,
  iconClasses,
  selected,
  onChange,
}: {
  value: RegistrationRole
  title: string
  description: string
  icon: LucideIcon
  iconClasses: string
  selected: boolean
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-xs rounded-md border p-sm transition-colors ${
        selected
          ? 'border-primary bg-canvas-soft'
          : 'border-hairline bg-surface hover:bg-canvas-soft'
      }`}
    >
      <input
        type="radio"
        name="role"
        value={value}
        checked={selected}
        onChange={onChange}
        className="mt-xxs size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-md ${iconClasses}`}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-body-sm font-medium text-ink">
          {title}
        </span>
        <span className="mt-xxs block text-caption text-ink-muted">
          {description}
        </span>
      </span>
    </label>
  )
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [values, setValues] = useState<RegisterFormValues>({
    role: '',
    firstName: '',
    middleName: '',
    lastName: '',
    username: '',
    password: '',
    faculty: '',
    teacherAccessCode: '',
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

    if (!isTextField(field)) {
      return
    }

    setValues((current) => ({ ...current, [field]: event.target.value }))
    clearFieldError(field)
  }

  const handleRoleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const role = event.target.value

    if (role !== 'student' && role !== 'instructor') {
      return
    }

    setValues((current) => ({
      ...current,
      role,
      teacherAccessCode:
        role === 'instructor' ? current.teacherAccessCode : '',
    }))
    setErrors((current) => {
      const next = { ...current }
      delete next.role
      delete next.teacherAccessCode
      return next
    })
    setServerError(null)
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

    if (
      error.code === 'INVALID_TEACHER_CODE' ||
      error.code === 'TEACHER_REGISTRATION_DISABLED'
    ) {
      setErrors({ teacherAccessCode: error.message })
      focusField(formRef.current, 'teacherAccessCode')
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
      const input: RegisterInput = {
        role: parsed.data.role,
        firstName: parsed.data.firstName,
        middleName: parsed.data.middleName,
        lastName: parsed.data.lastName,
        username: parsed.data.username,
        password: parsed.data.password,
        faculty: parsed.data.faculty,
        tosAccepted: true,
      }

      if (
        parsed.data.role === 'instructor' &&
        parsed.data.teacherAccessCode
      ) {
        input.teacherAccessCode = parsed.data.teacherAccessCode
      }

      await register(input)
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
  const roleDescribedBy = errors.role ? 'register-role-error' : undefined
  const teacherCodeDescribedBy = errors.teacherAccessCode
    ? 'register-teacher-code-hint register-teacher-code-error'
    : 'register-teacher-code-hint'
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

      <fieldset aria-describedby={roleDescribedBy}>
        <legend className="text-body-sm font-medium text-ink">
          I am registering as
        </legend>
        <div className="mt-xs grid grid-cols-1 gap-sm sm:grid-cols-2">
          <RoleCard
            value="student"
            title="Student"
            description="Join subjects and track your progress."
            icon={GraduationCap}
            iconClasses="bg-accent-sky text-ink"
            selected={values.role === 'student'}
            onChange={handleRoleChange}
          />
          <RoleCard
            value="instructor"
            title="Teacher"
            description="Create subjects and manage students."
            icon={Presentation}
            iconClasses="bg-accent-purple text-ink"
            selected={values.role === 'instructor'}
            onChange={handleRoleChange}
          />
        </div>
        <FieldError id="register-role-error" message={errors.role} />
      </fieldset>

      {values.role === 'instructor' && (
        <div>
          <label
            htmlFor="register-teacher-code"
            className={FIELD_LABEL_CLASSES}
          >
            <span className="inline-flex items-center gap-xxs">
              <FieldLabelIcon icon={KeyRound} />
              Teacher access code
            </span>
          </label>
          <input
            id="register-teacher-code"
            name="teacherAccessCode"
            type="password"
            autoComplete="off"
            value={values.teacherAccessCode}
            onChange={handleTextChange}
            aria-invalid={Boolean(errors.teacherAccessCode)}
            aria-describedby={teacherCodeDescribedBy}
            className={FIELD_INPUT_CLASSES}
          />
          <p id="register-teacher-code-hint" className={FIELD_HINT_CLASSES}>
            Ask your school administrator for the teacher access code.
          </p>
          <FieldError
            id="register-teacher-code-error"
            message={errors.teacherAccessCode}
          />
        </div>
      )}

      <fieldset>
        <legend className="flex items-center gap-xs">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-sky text-ink">
            <UserRound className="size-4" aria-hidden="true" />
          </span>
          <span className="text-body-sm font-medium text-ink">Full name</span>
        </legend>
        <div className="mt-sm grid gap-sm sm:grid-cols-3">
          <div>
            <label htmlFor="register-first-name" className={FIELD_LABEL_CLASSES}>
              First name
            </label>
            <input
              id="register-first-name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              maxLength={NAME_MAX_LENGTH}
              value={values.firstName}
              onChange={handleTextChange}
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={
                errors.firstName ? 'register-first-name-error' : undefined
              }
              className={FIELD_INPUT_CLASSES}
            />
            <FieldError
              id="register-first-name-error"
              message={errors.firstName}
            />
          </div>
          <div>
            <label
              htmlFor="register-middle-name"
              className={FIELD_LABEL_CLASSES}
            >
              Middle name
            </label>
            <input
              id="register-middle-name"
              name="middleName"
              type="text"
              autoComplete="additional-name"
              maxLength={NAME_MAX_LENGTH}
              value={values.middleName}
              onChange={handleTextChange}
              aria-invalid={Boolean(errors.middleName)}
              aria-describedby={
                errors.middleName ? 'register-middle-name-error' : undefined
              }
              className={FIELD_INPUT_CLASSES}
            />
            <FieldError
              id="register-middle-name-error"
              message={errors.middleName}
            />
          </div>
          <div>
            <label htmlFor="register-last-name" className={FIELD_LABEL_CLASSES}>
              Last name
            </label>
            <input
              id="register-last-name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              maxLength={NAME_MAX_LENGTH}
              value={values.lastName}
              onChange={handleTextChange}
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={
                errors.lastName ? 'register-last-name-error' : undefined
              }
              className={FIELD_INPUT_CLASSES}
            />
            <FieldError
              id="register-last-name-error"
              message={errors.lastName}
            />
          </div>
        </div>
      </fieldset>

      <div>
        <label htmlFor="register-username" className={FIELD_LABEL_CLASSES}>
          <span className="inline-flex items-center gap-xxs">
            <FieldLabelIcon icon={IdCard} />
            Username
          </span>
        </label>
        <input
          id="register-username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          placeholder="TUPT-00-0000"
          value={values.username}
          onChange={handleTextChange}
          aria-invalid={Boolean(errors.username)}
          aria-describedby={usernameDescribedBy}
          className={`${FIELD_INPUT_CLASSES} uppercase placeholder:normal-case`}
        />
        <p id="register-username-hint" className={FIELD_HINT_CLASSES}>
          Format: TUPT-00-0000, using your school ID number.
        </p>
        <FieldError id="register-username-error" message={errors.username} />
      </div>

      <div>
        <label htmlFor="register-password" className={FIELD_LABEL_CLASSES}>
          <span className="inline-flex items-center gap-xxs">
            <FieldLabelIcon icon={LockKeyhole} />
            Password
          </span>
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
          <span className="inline-flex items-center gap-xxs">
            <FieldLabelIcon icon={Building2} />
            Faculty
          </span>
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

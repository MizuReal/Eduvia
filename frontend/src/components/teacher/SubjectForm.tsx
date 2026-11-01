import { CheckCircle2 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  COURSE_CODE_MAX_LENGTH,
  COURSE_CODE_MIN_LENGTH,
  COURSE_NAME_MAX_LENGTH,
  COURSE_TERM_OPTIONS,
  YEAR_LEVEL_OPTIONS,
} from '../../config/course'
import { createCourseSchema } from '../../schemas/course'
import { ApiError } from '../../services/apiClient'
import type { CreateCourseInput } from '../../types/course'
import { FieldError } from '../auth/FieldError'
import { FormAlert } from '../auth/FormAlert'
import {
  fieldErrorsFromApi,
  fieldErrorsFromZod,
  firstInvalidField,
  focusField,
} from '../auth/formErrors'
import type { FieldErrors } from '../auth/formErrors'
import {
  FIELD_HINT_CLASSES,
  FIELD_INPUT_CLASSES,
  FIELD_LABEL_CLASSES,
} from '../auth/formStyles'
import { Button } from '../ui/Button'

type SubjectFormProps = {
  onCreate: (input: CreateCourseInput) => Promise<void>
}

type FormValues = {
  name: string
  code: string
  term: string
  yearLevel: string
}

const INITIAL_VALUES: FormValues = {
  name: '',
  code: '',
  term: '',
  yearLevel: '',
}

const VALIDATION_MESSAGE = 'Please check the highlighted fields.'

export function SubjectForm({ onCreate }: SubjectFormProps) {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const clearFieldError = (field: keyof FormValues) => {
    setErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
    setServerError(null)
    setSuccessMessage(null)
  }

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const field = event.target.name

    if (
      field !== 'name' &&
      field !== 'code' &&
      field !== 'term' &&
      field !== 'yearLevel'
    ) {
      return
    }

    const value =
      field === 'code' ? event.target.value.toUpperCase() : event.target.value

    setValues((current) => ({ ...current, [field]: value }))
    clearFieldError(field)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setSuccessMessage(null)
    setServerError(null)

    const parsed = createCourseSchema.safeParse(values)

    if (!parsed.success) {
      setErrors(fieldErrorsFromZod(parsed.error))
      focusField(formRef.current, firstInvalidField(parsed.error))
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      await onCreate(parsed.data)
      setValues(INITIAL_VALUES)
      setSuccessMessage('Subject created. It is now in your list.')
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'COURSE_CODE_TAKEN') {
          setErrors({ code: error.message })
          focusField(formRef.current, 'code')
        } else if (error.code === 'VALIDATION_ERROR') {
          const apiErrors = fieldErrorsFromApi(error)

          if (Object.keys(apiErrors).length > 0) {
            setErrors(apiErrors)
            focusField(formRef.current, Object.keys(apiErrors)[0])
          }

          setServerError(VALIDATION_MESSAGE)
        } else {
          setServerError(error.message)
        }
      } else {
        setServerError('Something went wrong. Try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const nameDescribedBy = errors.name
    ? 'subject-name-hint subject-name-error'
    : 'subject-name-hint'
  const codeDescribedBy = errors.code
    ? 'subject-code-hint subject-code-error'
    : 'subject-code-hint'

  return (
    <section
      aria-labelledby="create-subject-heading"
      className="rounded-lg border border-hairline bg-surface p-lg shadow-soft"
    >
      <h2 id="create-subject-heading" className="text-heading-3">
        Create subject
      </h2>
      <p className="mt-xxs text-body-sm text-ink-muted">
        Add a subject to your teacher workspace.
      </p>

      <form
        ref={formRef}
        noValidate
        aria-busy={isSubmitting}
        onSubmit={handleSubmit}
        className="mt-md space-y-md"
      >
        <FormAlert message={serverError} />

        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-xs rounded-md border border-accent-green/30 bg-canvas-soft p-sm text-body-sm text-ink"
          >
            <CheckCircle2
              className="mt-xxs size-4 shrink-0 text-accent-green"
              aria-hidden="true"
            />
            <p>{successMessage}</p>
          </div>
        )}

        <div>
          <label htmlFor="subject-name" className={FIELD_LABEL_CLASSES}>
            Subject name
          </label>
          <input
            id="subject-name"
            name="name"
            type="text"
            autoComplete="off"
            maxLength={COURSE_NAME_MAX_LENGTH}
            value={values.name}
            onChange={handleChange}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={nameDescribedBy}
            className={FIELD_INPUT_CLASSES}
          />
          <p id="subject-name-hint" className={FIELD_HINT_CLASSES}>
            Example: Web Systems and Technologies.
          </p>
          <FieldError id="subject-name-error" message={errors.name} />
        </div>

        <div>
          <label htmlFor="subject-code" className={FIELD_LABEL_CLASSES}>
            Subject code
          </label>
          <input
            id="subject-code"
            name="code"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={COURSE_CODE_MAX_LENGTH}
            value={values.code}
            onChange={handleChange}
            aria-invalid={Boolean(errors.code)}
            aria-describedby={codeDescribedBy}
            className={FIELD_INPUT_CLASSES}
          />
          <p id="subject-code-hint" className={FIELD_HINT_CLASSES}>
            {COURSE_CODE_MIN_LENGTH}–{COURSE_CODE_MAX_LENGTH} letters, numbers,
            or hyphens. Saved in uppercase.
          </p>
          <FieldError id="subject-code-error" message={errors.code} />
        </div>

        <div className="grid gap-md sm:grid-cols-2">
          <div>
            <label htmlFor="subject-term" className={FIELD_LABEL_CLASSES}>
              Trimester
            </label>
            <select
              id="subject-term"
              name="term"
              value={values.term}
              onChange={handleChange}
              aria-invalid={Boolean(errors.term)}
              aria-describedby={errors.term ? 'subject-term-error' : undefined}
              className={FIELD_INPUT_CLASSES}
            >
              <option value="" disabled>
                Select trimester
              </option>
              {COURSE_TERM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError id="subject-term-error" message={errors.term} />
          </div>

          <div>
            <label htmlFor="subject-year-level" className={FIELD_LABEL_CLASSES}>
              Year level
            </label>
            <select
              id="subject-year-level"
              name="yearLevel"
              value={values.yearLevel}
              onChange={handleChange}
              aria-invalid={Boolean(errors.yearLevel)}
              aria-describedby={
                errors.yearLevel ? 'subject-year-level-error' : undefined
              }
              className={FIELD_INPUT_CLASSES}
            >
              <option value="" disabled>
                Select year
              </option>
              {YEAR_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError
              id="subject-year-level-error"
              message={errors.yearLevel}
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating subject…' : 'Create subject'}
        </Button>
      </form>
    </section>
  )
}

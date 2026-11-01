import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  COURSE_CODE_MAX_LENGTH,
  COURSE_CODE_MIN_LENGTH,
  COURSE_NAME_MAX_LENGTH,
  COURSE_TERM_OPTIONS,
  YEAR_LEVEL_OPTIONS,
} from '../../config/course'
import { createCourseFormSchema } from '../../schemas/course'
import type {
  CreateCourseFormInput,
  CreateCourseFormOutput,
} from '../../schemas/course'
import { ApiError } from '../../services/apiClient'
import type { Course, CreateCourseInput } from '../../types/course'
import { suggestCourseCode } from '../../utils/courseCode'
import { FieldError } from '../auth/FieldError'
import { FormAlert } from '../auth/FormAlert'
import {
  FIELD_HINT_CLASSES,
  FIELD_INPUT_CLASSES,
  FIELD_LABEL_CLASSES,
} from '../auth/formStyles'
import { Button } from '../ui/Button'

type SubjectFormProps = {
  onCreate: (input: CreateCourseInput) => Promise<Course>
}

type CodeMode = 'auto' | 'custom'

const VALIDATION_MESSAGE = 'Please check the highlighted fields.'
const CUSTOM_CODE_REQUIRED = 'Enter a subject code or use automatic.'

export function SubjectForm({ onCreate }: SubjectFormProps) {
  const [codeMode, setCodeMode] = useState<CodeMode>('auto')
  const [namePreview, setNamePreview] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<CreateCourseFormInput, unknown, CreateCourseFormOutput>({
    resolver: zodResolver(createCourseFormSchema),
    defaultValues: { name: '', code: '', term: '', yearLevel: '' },
  })

  const previewCode = namePreview.trim() ? suggestCourseCode(namePreview) : ''

  const clearFeedback = () => {
    setServerError(null)
    setSuccessMessage(null)
  }

  const enableCustomCode = () => {
    setCodeMode('custom')
    setValue('code', previewCode)
    clearErrors('code')
    clearFeedback()
  }

  const enableAutomaticCode = () => {
    setCodeMode('auto')
    setValue('code', '')
    clearErrors('code')
    clearFeedback()
  }

  const submit = handleSubmit(async (values) => {
    clearFeedback()

    if (codeMode === 'custom' && values.code.trim() === '') {
      setError('code', { type: 'manual', message: CUSTOM_CODE_REQUIRED })
      setFocus('code')
      return
    }

    const input: CreateCourseInput = {
      name: values.name,
      term: values.term,
      yearLevel: values.yearLevel,
      ...(codeMode === 'custom' ? { code: values.code } : {}),
    }

    try {
      const created = await onCreate(input)
      reset()
      setNamePreview('')
      setCodeMode('auto')
      setSuccessMessage(`Subject created with code ${created.code}.`)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'COURSE_CODE_TAKEN') {
          if (codeMode === 'custom') {
            setError('code', { type: 'server', message: error.message })
            setFocus('code')
          } else {
            setServerError(error.message)
          }
          return
        }

        if (error.code === 'VALIDATION_ERROR') {
          let firstInvalidField:
            'name' | 'code' | 'term' | 'yearLevel' | undefined

          for (const detail of error.details ?? []) {
            if (
              detail.path === 'name' ||
              detail.path === 'code' ||
              detail.path === 'term' ||
              detail.path === 'yearLevel'
            ) {
              setError(detail.path, {
                type: 'server',
                message: detail.message,
              })
              firstInvalidField ??= detail.path
            }
          }

          if (firstInvalidField) {
            setFocus(firstInvalidField)
          }

          setServerError(VALIDATION_MESSAGE)
          return
        }

        setServerError(error.message)
      } else {
        setServerError('Something went wrong. Try again.')
      }
    }
  })

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
        noValidate
        aria-busy={isSubmitting}
        onSubmit={submit}
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
            type="text"
            autoComplete="off"
            maxLength={COURSE_NAME_MAX_LENGTH}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={nameDescribedBy}
            className={FIELD_INPUT_CLASSES}
            {...register('name', {
              onChange: (event) => {
                setNamePreview(event.target.value)
                clearErrors('name')
                clearFeedback()
              },
            })}
          />
          <p id="subject-name-hint" className={FIELD_HINT_CLASSES}>
            Example: Web Systems and Technologies.
          </p>
          <FieldError id="subject-name-error" message={errors.name?.message} />
        </div>

        <div>
          <div className="flex items-center justify-between gap-sm">
            <span id="subject-code-label" className={FIELD_LABEL_CLASSES}>
              Subject code
            </span>
            <button
              type="button"
              className="min-h-11 rounded-sm px-xs text-caption font-medium text-primary transition-colors hover:text-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-pressed={codeMode === 'custom'}
              onClick={
                codeMode === 'auto' ? enableCustomCode : enableAutomaticCode
              }
            >
              {codeMode === 'auto' ? 'Use custom code' : 'Use automatic code'}
            </button>
          </div>

          {codeMode === 'auto' ? (
            <output
              id="subject-code-preview"
              aria-labelledby="subject-code-label"
              aria-describedby={codeDescribedBy}
              className="flex min-h-11 w-full items-center justify-between gap-sm rounded-xs border border-hairline bg-canvas-soft px-xs py-xxs text-body-sm text-ink"
            >
              <span className="font-medium tracking-wide">
                {previewCode || '—'}
              </span>
              <span className="rounded-full bg-surface px-xs py-xxs text-eyebrow text-ink-muted">
                Auto
              </span>
            </output>
          ) : (
            <input
              id="subject-code"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={COURSE_CODE_MAX_LENGTH}
              aria-labelledby="subject-code-label"
              aria-invalid={Boolean(errors.code)}
              aria-describedby={codeDescribedBy}
              className={FIELD_INPUT_CLASSES}
              {...register('code', {
                onChange: () => {
                  clearErrors('code')
                  clearFeedback()
                },
              })}
            />
          )}

          <p id="subject-code-hint" className={FIELD_HINT_CLASSES}>
            {codeMode === 'auto'
              ? 'Generated from the subject name. A number is added if it is already taken.'
              : `${COURSE_CODE_MIN_LENGTH}–${COURSE_CODE_MAX_LENGTH} letters, numbers, or hyphens. Saved in uppercase.`}
          </p>
          <FieldError id="subject-code-error" message={errors.code?.message} />
        </div>

        <div className="grid gap-md sm:grid-cols-2">
          <div>
            <label htmlFor="subject-term" className={FIELD_LABEL_CLASSES}>
              Trimester
            </label>
            <select
              id="subject-term"
              aria-invalid={Boolean(errors.term)}
              aria-describedby={errors.term ? 'subject-term-error' : undefined}
              className={FIELD_INPUT_CLASSES}
              {...register('term', {
                onChange: () => {
                  clearErrors('term')
                  clearFeedback()
                },
              })}
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
            <FieldError
              id="subject-term-error"
              message={errors.term?.message}
            />
          </div>

          <div>
            <label htmlFor="subject-year-level" className={FIELD_LABEL_CLASSES}>
              Year level
            </label>
            <select
              id="subject-year-level"
              aria-invalid={Boolean(errors.yearLevel)}
              aria-describedby={
                errors.yearLevel ? 'subject-year-level-error' : undefined
              }
              className={FIELD_INPUT_CLASSES}
              {...register('yearLevel', {
                onChange: () => {
                  clearErrors('yearLevel')
                  clearFeedback()
                },
              })}
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
              message={errors.yearLevel?.message}
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

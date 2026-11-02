import type {
  FieldErrors,
  UseFormRegister,
} from 'react-hook-form'
import type { DocumentQuizFormValues } from '../../schemas/quiz'
import {
  CORRECT_OPTIONS,
  MAX_QUIZ_QUESTIONS,
  MIN_QUIZ_QUESTIONS,
} from '../../config/quiz'
import { FieldError } from '../auth/FieldError'
import { FIELD_HINT_CLASSES, FIELD_LABEL_CLASSES } from '../auth/formStyles'

type AnswerKeyGridProps = {
  fields: { id: string }[]
  register: UseFormRegister<DocumentQuizFormValues>
  errors: FieldErrors<DocumentQuizFormValues>
  onCountChange: (count: number) => void
}

const QUESTION_COUNTS = Array.from(
  { length: MAX_QUIZ_QUESTIONS - MIN_QUIZ_QUESTIONS + 1 },
  (_, index) => MIN_QUIZ_QUESTIONS + index,
)

export function AnswerKeyGrid({
  fields,
  register,
  errors,
  onCountChange,
}: AnswerKeyGridProps) {
  return (
    <section aria-labelledby="answer-key-heading">
      <div className="flex flex-wrap items-end justify-between gap-sm">
        <div>
          <h2 id="answer-key-heading" className="text-title text-ink">
            Answer key
          </h2>
          <p className="mt-xxs text-body-sm text-ink-muted">
            Select the correct option for every numbered question on the paper.
          </p>
        </div>
        <div>
          <label htmlFor="answer-key-count" className={FIELD_LABEL_CLASSES}>
            Number of questions
          </label>
          <select
            id="answer-key-count"
            value={fields.length}
            onChange={(event) => onCountChange(Number(event.target.value))}
            className="min-h-11 rounded-md border border-hairline bg-surface px-xs text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {QUESTION_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
          <p className={FIELD_HINT_CLASSES}>
            {MIN_QUIZ_QUESTIONS}–{MAX_QUIZ_QUESTIONS} questions.
          </p>
        </div>
      </div>

      <ol className="mt-md space-y-xs">
        {fields.map((field, index) => {
          const error = errors.answers?.[index]?.correctOption?.message

          return (
            <li
              key={field.id}
              className="rounded-md border border-hairline bg-surface px-sm py-xs"
            >
              <fieldset>
                <legend className="text-body-sm font-medium text-ink">
                  Question {index + 1}
                </legend>
                <div className="mt-xxs flex flex-wrap gap-xs">
                  {CORRECT_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-xxs rounded-md border border-hairline px-xs text-body-sm text-ink hover:bg-canvas-soft"
                    >
                      <input
                        type="radio"
                        value={option}
                        aria-describedby={
                          error ? `answer-key-error-${index}` : undefined
                        }
                        {...register(`answers.${index}.correctOption`)}
                        className="size-4 accent-primary"
                      />
                      {option}
                    </label>
                  ))}
                </div>
                <FieldError id={`answer-key-error-${index}`} message={error} />
              </fieldset>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

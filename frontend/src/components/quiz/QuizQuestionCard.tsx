import {
  ChevronDown,
  ChevronUp,
  Copy,
  Trash2,
} from 'lucide-react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import type { NativeQuizFormValues } from '../../schemas/quiz'
import {
  CORRECT_OPTIONS,
  QUIZ_PROMPT_MAX_LENGTH,
  QUIZ_OPTION_MAX_LENGTH,
  QUIZ_EXPLANATION_MAX_LENGTH,
} from '../../config/quiz'
import { FieldError } from '../auth/FieldError'
import {
  FIELD_HINT_CLASSES,
  FIELD_INPUT_CLASSES,
  FIELD_LABEL_CLASSES,
} from '../auth/formStyles'
import { Button } from '../ui/Button'

type QuizQuestionCardProps = {
  index: number
  register: UseFormRegister<NativeQuizFormValues>
  errors: FieldErrors<NativeQuizFormValues>
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onRemove: () => void
}

const OPTION_FIELDS = [
  { key: 'optionA', label: 'A' },
  { key: 'optionB', label: 'B' },
  { key: 'optionC', label: 'C' },
  { key: 'optionD', label: 'D' },
] as const

export function QuizQuestionCard({
  index,
  register,
  errors,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: QuizQuestionCardProps) {
  const questionErrors = errors.questions?.[index]

  return (
    <li className="rounded-lg border border-hairline bg-surface p-lg shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h3 className="text-title text-ink">Question {index + 1}</h3>
        <div className="flex items-center gap-xxs">
          <Button
            variant="utility"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label={`Move question ${index + 1} up`}
          >
            <ChevronUp className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="utility"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label={`Move question ${index + 1} down`}
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="utility"
            onClick={onDuplicate}
            aria-label={`Duplicate question ${index + 1}`}
          >
            <Copy className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="utility"
            onClick={onRemove}
            aria-label={`Delete question ${index + 1}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="mt-md">
        <label
          htmlFor={`quiz-question-${index}-prompt`}
          className={FIELD_LABEL_CLASSES}
        >
          Question
        </label>
        <textarea
          id={`quiz-question-${index}-prompt`}
          rows={3}
          maxLength={QUIZ_PROMPT_MAX_LENGTH}
          aria-invalid={Boolean(questionErrors?.prompt)}
          aria-describedby={
            questionErrors?.prompt
              ? `quiz-question-${index}-prompt-error`
              : undefined
          }
          className={FIELD_INPUT_CLASSES}
          {...register(`questions.${index}.prompt`)}
        />
        <FieldError
          id={`quiz-question-${index}-prompt-error`}
          message={questionErrors?.prompt?.message}
        />
      </div>

      <div className="mt-md grid gap-sm sm:grid-cols-2">
        {OPTION_FIELDS.map((option) => (
          <div key={option.key}>
            <label
              htmlFor={`quiz-question-${index}-${option.key}`}
              className={FIELD_LABEL_CLASSES}
            >
              Option {option.label}
            </label>
            <input
              id={`quiz-question-${index}-${option.key}`}
              type="text"
              maxLength={QUIZ_OPTION_MAX_LENGTH}
              aria-invalid={Boolean(questionErrors?.[option.key])}
              aria-describedby={
                questionErrors?.[option.key]
                  ? `quiz-question-${index}-${option.key}-error`
                  : undefined
              }
              className={FIELD_INPUT_CLASSES}
              {...register(`questions.${index}.${option.key}`)}
            />
            <FieldError
              id={`quiz-question-${index}-${option.key}-error`}
              message={questionErrors?.[option.key]?.message}
            />
          </div>
        ))}
      </div>

      <div className="mt-md">
        <fieldset>
          <legend className={FIELD_LABEL_CLASSES}>Correct answer</legend>
          <div className="flex flex-wrap gap-xs">
            {CORRECT_OPTIONS.map((option) => (
              <label
                key={option}
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-xxs rounded-md border border-hairline px-xs text-body-sm text-ink hover:bg-canvas-soft"
              >
                <input
                  type="radio"
                  value={option}
                  {...register(`questions.${index}.correctOption`)}
                  className="size-4 accent-primary"
                />
                {option}
              </label>
            ))}
          </div>
          <FieldError
            id={`quiz-question-${index}-correct-error`}
            message={questionErrors?.correctOption?.message}
          />
        </fieldset>
      </div>

      <div className="mt-md">
        <label
          htmlFor={`quiz-question-${index}-explanation`}
          className={FIELD_LABEL_CLASSES}
        >
          Explanation (optional)
        </label>
        <textarea
          id={`quiz-question-${index}-explanation`}
          rows={2}
          maxLength={QUIZ_EXPLANATION_MAX_LENGTH}
          aria-invalid={Boolean(questionErrors?.explanation)}
          aria-describedby={
            questionErrors?.explanation
              ? `quiz-question-${index}-explanation-error`
              : undefined
          }
          className={FIELD_INPUT_CLASSES}
          {...register(`questions.${index}.explanation`)}
        />
        <FieldError
          id={`quiz-question-${index}-explanation-error`}
          message={questionErrors?.explanation?.message}
        />
        <p className={FIELD_HINT_CLASSES}>
          Shown in teacher preview. Future student results can use this too.
        </p>
      </div>
    </li>
  )
}

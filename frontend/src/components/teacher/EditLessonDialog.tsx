import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  LESSON_TITLE_MAX_LENGTH,
  LESSON_TITLE_MIN_LENGTH,
} from '../../config/course'
import { ApiError } from '../../services/apiClient'
import type { CourseTopic, Lesson } from '../../types/courseOutline'
import { FieldError } from '../auth/FieldError'
import { FormAlert } from '../auth/FormAlert'
import { FIELD_INPUT_CLASSES, FIELD_LABEL_CLASSES } from '../auth/formStyles'
import { Button } from '../ui/Button'
import { DIALOG_ACTIONS_CLASSES, DIALOG_CLASSES } from './dialogStyles'

const editLessonSchema = z.object({
  title: z
    .string()
    .trim()
    .min(
      LESSON_TITLE_MIN_LENGTH,
      `Use ${LESSON_TITLE_MIN_LENGTH}–${LESSON_TITLE_MAX_LENGTH} characters.`,
    )
    .max(
      LESSON_TITLE_MAX_LENGTH,
      `Use ${LESSON_TITLE_MIN_LENGTH}–${LESSON_TITLE_MAX_LENGTH} characters.`,
    ),
  topicId: z.string().uuid('Select a topic.'),
})

type EditLessonValues = z.infer<typeof editLessonSchema>

type EditLessonDialogProps = {
  lesson: Lesson
  topics: CourseTopic[]
  onSave: (input: { title: string; topicId: string }) => Promise<void>
  onClose: () => void
}

export function EditLessonDialog({
  lesson,
  topics,
  onSave,
  onClose,
}: EditLessonDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditLessonValues>({
    resolver: zodResolver(editLessonSchema),
    defaultValues: { title: lesson.title, topicId: lesson.topicId },
  })

  useEffect(() => {
    // Mount-only: the dialog is rendered only while an edit is active.
    dialogRef.current?.showModal()
  }, [])

  const submit = handleSubmit(async (values) => {
    setServerError(null)

    try {
      await onSave({ title: values.title, topicId: values.topicId })
      onClose()
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : 'Something went wrong. Try again.',
      )
    }
  })

  return (
    // Backdrop clicks close the dialog; Escape is handled by onCancel.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="edit-lesson-title"
      aria-describedby="edit-lesson-description"
      className={DIALOG_CLASSES}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose()
        }
      }}
    >
      <div className="p-lg">
        <h2 id="edit-lesson-title" className="text-heading-3">
          Edit lesson
        </h2>
        <p
          id="edit-lesson-description"
          className="mt-xxs text-body-sm text-ink-muted"
        >
          Update the lesson title or move it to another topic.
        </p>

        <form
          noValidate
          aria-busy={isSubmitting}
          onSubmit={submit}
          className="mt-md"
        >
          <FormAlert message={serverError} />

          <div className="mt-md">
            <label
              htmlFor="edit-lesson-title-input"
              className={FIELD_LABEL_CLASSES}
            >
              Lesson title
            </label>
            <input
              id="edit-lesson-title-input"
              type="text"
              autoComplete="off"
              maxLength={LESSON_TITLE_MAX_LENGTH}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={
                errors.title
                  ? 'edit-lesson-title-hint edit-lesson-title-error'
                  : 'edit-lesson-title-hint'
              }
              className={FIELD_INPUT_CLASSES}
              {...register('title')}
            />
            <p
              id="edit-lesson-title-hint"
              className="mt-xxs text-caption text-ink-muted"
            >
              {LESSON_TITLE_MIN_LENGTH}–{LESSON_TITLE_MAX_LENGTH} characters.
            </p>
            <FieldError
              id="edit-lesson-title-error"
              message={errors.title?.message}
            />
          </div>

          <div className="mt-md">
            <label htmlFor="edit-lesson-topic" className={FIELD_LABEL_CLASSES}>
              Topic
            </label>
            <select
              id="edit-lesson-topic"
              aria-invalid={Boolean(errors.topicId)}
              aria-describedby={
                errors.topicId ? 'edit-lesson-topic-error' : undefined
              }
              className={FIELD_INPUT_CLASSES}
              {...register('topicId')}
            >
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.title}
                </option>
              ))}
            </select>
            <FieldError
              id="edit-lesson-topic-error"
              message={errors.topicId?.message}
            />
          </div>

          <div className={DIALOG_ACTIONS_CLASSES}>
            <Button type="button" variant="utility" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save lesson'}
            </Button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

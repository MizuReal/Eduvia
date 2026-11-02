import { FileUp, ListChecks } from 'lucide-react'
import { Button } from '../ui/Button'
import { FormAlert } from '../auth/FormAlert'

type QuizModeChoiceProps = {
  isCreating: boolean
  error: string | null
  onChoose: (mode: 'native' | 'document') => void
}

export function QuizModeChoice({
  isCreating,
  error,
  onChoose,
}: QuizModeChoiceProps) {
  return (
    <div>
      <h2 className="text-heading-3">Create the topic quiz</h2>
      <p className="mt-xxs max-w-2xl text-body-sm text-ink-muted">
        Build the quiz in Eduvia, or upload an existing PDF/DOCX paper and enter
        its A–D answer key. A quiz needs 10–20 questions before it can be
        published.
      </p>

      <div className="mt-md">
        <FormAlert message={error} />
      </div>

      <div className="mt-md grid gap-md md:grid-cols-2">
        <button
          type="button"
          disabled={isCreating}
          onClick={() => onChoose('native')}
          className="group rounded-lg border border-hairline bg-surface p-lg text-left shadow-soft transition-colors hover:border-primary/50 hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex size-11 items-center justify-center rounded-md bg-canvas-soft">
            <ListChecks className="size-5 text-ink-secondary" aria-hidden="true" />
          </span>
          <span className="mt-sm block text-title text-ink">
            Build a quiz
          </span>
          <span className="mt-xxs block text-body-sm text-ink-muted">
            Add questions and A–D options directly in Eduvia. Fully editable.
          </span>
          <span className="mt-md inline-flex text-body-sm font-medium text-primary">
            Start building
          </span>
        </button>

        <button
          type="button"
          disabled={isCreating}
          onClick={() => onChoose('document')}
          className="group rounded-lg border border-hairline bg-surface p-lg text-left shadow-soft transition-colors hover:border-primary/50 hover:bg-canvas-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex size-11 items-center justify-center rounded-md bg-canvas-soft">
            <FileUp className="size-5 text-ink-secondary" aria-hidden="true" />
          </span>
          <span className="mt-sm block text-title text-ink">
            Upload a quiz paper
          </span>
          <span className="mt-xxs block text-body-sm text-ink-muted">
            Upload the original PDF/DOCX and enter the 10–20 A–D answers.
          </span>
          <span className="mt-md inline-flex text-body-sm font-medium text-primary">
            Upload paper
          </span>
        </button>
      </div>

      {isCreating && (
        <Button variant="utility" className="mt-md" disabled>
          Creating quiz…
        </Button>
      )}
    </div>
  )
}

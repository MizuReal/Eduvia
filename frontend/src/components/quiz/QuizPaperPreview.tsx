import { useEffect, useState } from 'react'
import { CircleAlert, Loader2, RefreshCw } from 'lucide-react'
import { getFileUrl } from '../../services/topicContentService'
import type { QuizFile } from '../../types/quiz'
import { Button } from '../ui/Button'

function buildDocxDocument(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin: 0; padding: 24px; font-family: Inter, -apple-system, system-ui, sans-serif; color: #000; background: #fff; line-height: 1.5; }
    h1,h2,h3,h4,h5,h6 { line-height: 1.2; margin: 1.2em 0 0.4em; }
    p { margin: 0.5em 0; }
    ul,ol { padding-left: 1.5em; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th,td { border: 1px solid #e6e6e6; padding: 6px 8px; text-align: left; }
    blockquote { border-left: 4px solid #e6e6e6; margin: 1em 0; padding-left: 16px; color: #31302e; }
    pre { background: #f6f5f4; padding: 12px; overflow-x: auto; }
    a { color: #0075de; }
    img { max-width: 100%; height: auto; }
  </style></head><body>${html}</body></html>`
}

type QuizPaperPreviewProps = {
  file: QuizFile
  accessToken: string
  signedUrl?: string
  className?: string
}

export function QuizPaperPreview({
  file,
  accessToken,
  signedUrl,
  className,
}: QuizPaperPreviewProps) {
  const [url, setUrl] = useState<string | null>(signedUrl ?? null)
  const [isLoading, setIsLoading] = useState(
    file.mimeType === 'application/pdf' && !signedUrl,
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (signedUrl) {
      setUrl(signedUrl)
      setIsLoading(false)
      setError(null)
    }
  }, [signedUrl])

  useEffect(() => {
    if (file.mimeType !== 'application/pdf' || signedUrl) {
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    void getFileUrl(file.id, accessToken)
      .then((signed) => {
        if (!cancelled) {
          setUrl(signed.url)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('We could not load the quiz paper. Try again.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, file.id, file.mimeType, signedUrl])

  if (file.mimeType === 'application/pdf') {
    if (isLoading) {
      return (
        <div className={className}>
          <div className="flex min-h-64 items-center justify-center rounded-lg border border-hairline bg-canvas-soft">
            <Loader2 className="size-6 animate-spin text-ink-muted" aria-hidden="true" />
            <span className="sr-only">Loading quiz paper</span>
          </div>
        </div>
      )
    }

    if (error || !url) {
      return (
        <div
          className={`${className ?? ''} flex min-h-64 flex-col items-center justify-center gap-sm rounded-lg border border-accent-orange-deep/30 bg-canvas-soft p-lg text-center`}
        >
          <CircleAlert
            className="size-6 text-accent-orange-deep"
            aria-hidden="true"
          />
          <p className="text-body-sm text-ink-muted">
            {error ?? 'The quiz paper is not available.'}
          </p>
          <Button
            variant="utility"
            onClick={() => {
              setError(null)
              setIsLoading(true)
              void getFileUrl(file.id, accessToken)
                .then((signed) => setUrl(signed.url))
                .catch(() => setError('We could not load the quiz paper.'))
                .finally(() => setIsLoading(false))
            }}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      )
    }

    return (
      <iframe
        title="Quiz paper"
        src={url}
        className={
          className ??
          'h-[70vh] w-full rounded-lg border border-hairline bg-surface'
        }
      />
    )
  }

  if (file.previewHtml) {
    return (
      <iframe
        title="Quiz paper"
        srcDoc={buildDocxDocument(file.previewHtml)}
        sandbox=""
        className={
          className ??
          'h-[70vh] w-full rounded-lg border border-hairline bg-surface'
        }
      />
    )
  }

  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-sm rounded-lg border border-hairline bg-canvas-soft p-lg text-center">
      <p className="text-body-sm text-ink-muted">
        This paper has a download-only preview.
      </p>
    </div>
  )
}

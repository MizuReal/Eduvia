import { zodResolver } from '@hookform/resolvers/zod'
import type { JSONContent } from '@tiptap/react'
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  Save,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { FormAlert } from '../auth/FormAlert'
import { FieldError } from '../auth/FieldError'
import { Button } from '../ui/Button'
import { RichTextEditor } from './RichTextEditor'
import { TopicAssetProvider } from './TopicAssetProvider'
import {
  contentTitleFormSchema,
  getDocumentSaveError,
} from '../../schemas/topicContent'
import { ApiError } from '../../services/apiClient'
import { getFileUrl, updateContent } from '../../services/topicContentService'
import type { DocContentItem, TopicAsset } from '../../types/topicContent'
import {
  CONTENT_TITLE_MAX_LENGTH,
  formatContentDate,
} from '../../config/content'

type DocsEditorPanelProps = {
  item: DocContentItem
  accessToken: string
  isActive: boolean
  onSaved: (item: DocContentItem) => void
  onDirtyChange: (dirty: boolean) => void
}

type TitleFormValues = {
  title: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function DocsEditorPanel({
  item,
  accessToken,
  isActive,
  onSaved,
  onDirtyChange,
}: DocsEditorPanelProps) {
  const assetsRef = useRef<TopicAsset[]>([])
  const saveRef = useRef<() => void>(() => undefined)
  const [content, setContent] = useState<JSONContent>(item.content)
  const [assets, setAssets] = useState<TopicAsset[]>(item.assets)
  const [isContentDirty, setIsContentDirty] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty: isTitleDirty, isSubmitting },
  } = useForm<TitleFormValues>({
    resolver: zodResolver(contentTitleFormSchema),
    defaultValues: { title: item.title },
  })

  useEffect(() => {
    assetsRef.current = assets
  }, [assets])

  useEffect(() => {
    setContent(item.content)
    setAssets(item.assets)
    reset({ title: item.title })
    setIsContentDirty(false)
    setSaveState('idle')
    setSaveError(null)
  }, [item, reset])

  const isDirty = isContentDirty || isTitleDirty

  useEffect(() => {
    onDirtyChange(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(
    () => () => {
      onDirtyChange(false)
    },
    [onDirtyChange],
  )

  const refreshAsset = useCallback(
    async (fileId: string) => {
      const existing = assetsRef.current.find((asset) => asset.id === fileId)

      if (!existing) {
        return null
      }

      try {
        const signed = await getFileUrl(fileId, accessToken)
        const updated: TopicAsset = {
          ...existing,
          url: signed.url,
          expiresAt: signed.expiresAt,
        }
        setAssets((current) =>
          current.map((asset) => (asset.id === fileId ? updated : asset)),
        )
        return updated
      } catch {
        return null
      }
    },
    [accessToken],
  )

  const handleEditorChange = (nextContent: JSONContent) => {
    setContent(nextContent)
    setIsContentDirty(true)
    setSaveState('idle')
    setSaveError(null)
  }

  const handleAssetAdded = (asset: TopicAsset) => {
    setAssets((current) => [...current, asset])
    setIsContentDirty(true)
    setSaveState('idle')
  }

  const save = handleSubmit(async (values) => {
    const validationError = getDocumentSaveError(content)

    if (validationError) {
      setSaveError(validationError)
      setSaveState('error')
      return
    }

    setSaveError(null)
    setSaveState('saving')

    try {
      const updated = await updateContent(
        item.id,
        { title: values.title, content },
        accessToken,
      )

      if (updated.kind !== 'doc') {
        setSaveError('We could not save this document. Try again.')
        setSaveState('error')
        return
      }

      setContent(updated.content)
      setAssets(updated.assets)
      reset({ title: updated.title })
      setIsContentDirty(false)
      setSaveState('saved')
      onSaved(updated)
    } catch (error) {
      setSaveError(
        error instanceof ApiError
          ? error.message
          : 'We could not save this document. Try again.',
      )
      setSaveState('error')
    }
  })

  useEffect(() => {
    saveRef.current = () => {
      void save()
    }
  }, [save])

  useEffect(() => {
    if (!isActive) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive])

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-sm">
        <div className="min-w-0 flex-1">
          <p className="text-eyebrow uppercase tracking-wide text-ink-muted">
            Document
          </p>
          <label htmlFor="docs-title" className="sr-only">
            Document title
          </label>
          <input
            id="docs-title"
            type="text"
            maxLength={CONTENT_TITLE_MAX_LENGTH}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'docs-title-error' : undefined}
            className="min-h-11 w-full rounded-xs border border-transparent bg-transparent px-0 text-heading-2 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-accent-orange-deep"
            {...register('title')}
          />
          <FieldError id="docs-title-error" message={errors.title?.message} />
          <p className="mt-xxs text-caption text-ink-muted">
            Last saved {formatContentDate(item.updatedAt)}
          </p>
        </div>

        <div className="flex items-center gap-sm">
          <p
            aria-live="polite"
            className="flex items-center gap-xxs text-caption text-ink-muted"
          >
            {isSubmitting || saveState === 'saving' ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : saveState === 'error' ? (
              <>
                <CircleAlert
                  className="size-4 text-accent-orange-deep"
                  aria-hidden="true"
                />
                Save failed
              </>
            ) : isDirty ? (
              <>
                <CircleAlert
                  className="size-4 text-accent-orange-deep"
                  aria-hidden="true"
                />
                Unsaved changes
              </>
            ) : (
              <>
                <CheckCircle2
                  className="size-4 text-accent-green"
                  aria-hidden="true"
                />
                All changes saved
              </>
            )}
          </p>
          <Button
            type="button"
            variant="primary"
            disabled={isSubmitting}
            onClick={() => void save()}
          >
            <Save className="size-4" aria-hidden="true" />
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {saveError && (
        <div className="mt-md">
          <FormAlert message={saveError} />
        </div>
      )}

      <div className="mt-md">
        <TopicAssetProvider assets={assets} refreshAsset={refreshAsset}>
          <RichTextEditor
            content={content}
            contentKey={`doc-${item.id}`}
            onChange={handleEditorChange}
            variant="doc"
            label="Document content"
            placeholder="Start writing your document…"
            contentId={item.id}
            accessToken={accessToken}
            onAssetAdded={handleAssetAdded}
          />
        </TopicAssetProvider>
      </div>
    </div>
  )
}

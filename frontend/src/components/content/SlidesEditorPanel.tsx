import { zodResolver } from '@hookform/resolvers/zod'
import type { JSONContent } from '@tiptap/react'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Copy,
  Loader2,
  Plus,
  Play,
  Save,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import clsx from 'clsx'
import { FormAlert } from '../auth/FormAlert'
import { FieldError } from '../auth/FieldError'
import { Button } from '../ui/Button'
import { RichTextEditor } from './RichTextEditor'
import { SlidePreviewDialog } from './SlidePreviewDialog'
import { TopicAssetProvider } from './TopicAssetProvider'
import {
  createEmptySlide,
  createEmptySlides,
  duplicateSlide,
  getSlidePreviewText,
} from './slideUtils'
import {
  CONTENT_TITLE_MAX_LENGTH,
  SLIDES_MAX_SLIDES,
  formatContentDate,
} from '../../config/content'
import {
  contentTitleFormSchema,
  getSlidesSaveError,
} from '../../schemas/topicContent'
import { ApiError } from '../../services/apiClient'
import { getFileUrl, updateContent } from '../../services/topicContentService'
import type {
  SlidesContentItem,
  SlidesDocument,
  TopicAsset,
} from '../../types/topicContent'

type SlidesEditorPanelProps = {
  item: SlidesContentItem
  accessToken: string
  isActive: boolean
  onSaved: (item: SlidesContentItem) => void
  onDirtyChange: (dirty: boolean) => void
}

type TitleFormValues = {
  title: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function SlidesEditorPanel({
  item,
  accessToken,
  isActive,
  onSaved,
  onDirtyChange,
}: SlidesEditorPanelProps) {
  const assetsRef = useRef<TopicAsset[]>([])
  const saveRef = useRef<() => void>(() => undefined)
  const [slides, setSlides] = useState<SlidesDocument>(item.content)
  const [activeSlideId, setActiveSlideId] = useState(
    item.content.slides[0]?.id ?? '',
  )
  const [assets, setAssets] = useState<TopicAsset[]>(item.assets)
  const [isContentDirty, setIsContentDirty] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
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
    const nextSlides =
      item.content.slides.length > 0 ? item.content : createEmptySlides()

    setSlides(nextSlides)
    setActiveSlideId((current) =>
      nextSlides.slides.some((slide) => slide.id === current)
        ? current
        : (nextSlides.slides[0]?.id ?? ''),
    )
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

  useEffect(() => {
    if (!isActive) {
      setIsPreviewOpen(false)
    }
  }, [isActive])

  const activeIndex = slides.slides.findIndex(
    (slide) => slide.id === activeSlideId,
  )
  const effectiveIndex = activeIndex >= 0 ? activeIndex : 0
  const activeSlide =
    activeIndex >= 0 ? slides.slides[activeIndex] : slides.slides[0]
  const atMaxSlides = slides.slides.length >= SLIDES_MAX_SLIDES

  const markDirty = () => {
    setIsContentDirty(true)
    setSaveState('idle')
    setSaveError(null)
  }

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
    if (!activeSlide) {
      return
    }

    setSlides((current) => ({
      ...current,
      slides: current.slides.map((slide) =>
        slide.id === activeSlide.id
          ? { ...slide, content: nextContent }
          : slide,
      ),
    }))
    markDirty()
  }

  const handleAssetAdded = (asset: TopicAsset) => {
    setAssets((current) => [...current, asset])
    markDirty()
  }

  const addSlide = () => {
    if (atMaxSlides) {
      return
    }

    const slide = createEmptySlide()
    setSlides((current) => ({
      ...current,
      slides: [...current.slides, slide],
    }))
    setActiveSlideId(slide.id)
    markDirty()
  }

  const duplicateActiveSlide = () => {
    if (!activeSlide || atMaxSlides) {
      return
    }

    const copy = duplicateSlide(activeSlide)
    const index = activeIndex >= 0 ? activeIndex : slides.slides.length - 1
    const nextSlides = [...slides.slides]
    nextSlides.splice(index + 1, 0, copy)
    setSlides((current) => ({ ...current, slides: nextSlides }))
    setActiveSlideId(copy.id)
    markDirty()
  }

  const deleteActiveSlide = () => {
    if (!activeSlide || slides.slides.length <= 1) {
      return
    }

    const index = activeIndex >= 0 ? activeIndex : 0
    const nextSlides = slides.slides.filter(
      (slide) => slide.id !== activeSlide.id,
    )
    const nextActive = nextSlides[Math.min(index, nextSlides.length - 1)]

    setSlides((current) => ({ ...current, slides: nextSlides }))
    setActiveSlideId(nextActive?.id ?? '')
    markDirty()
  }

  const moveSlide = (slideId: string, offset: number) => {
    const index = slides.slides.findIndex((slide) => slide.id === slideId)
    const target = index + offset

    if (index < 0 || target < 0 || target >= slides.slides.length) {
      return
    }

    const nextSlides = [...slides.slides]
    const [moved] = nextSlides.splice(index, 1)

    if (!moved) {
      return
    }

    nextSlides.splice(target, 0, moved)
    setSlides((current) => ({ ...current, slides: nextSlides }))
    markDirty()
  }

  const save = handleSubmit(async (values) => {
    const validationError = getSlidesSaveError(slides)

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
        { title: values.title, content: slides },
        accessToken,
      )

      if (updated.kind !== 'slides') {
        setSaveError('We could not save these slides. Try again.')
        setSaveState('error')
        return
      }

      setSlides(updated.content)
      setAssets(updated.assets)
      setActiveSlideId((current) =>
        updated.content.slides.some((slide) => slide.id === current)
          ? current
          : (updated.content.slides[0]?.id ?? ''),
      )
      reset({ title: updated.title })
      setIsContentDirty(false)
      setSaveState('saved')
      onSaved(updated)
    } catch (error) {
      setSaveError(
        error instanceof ApiError
          ? error.message
          : 'We could not save these slides. Try again.',
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
            Slides
          </p>
          <label htmlFor="slides-title" className="sr-only">
            Slides title
          </label>
          <input
            id="slides-title"
            type="text"
            maxLength={CONTENT_TITLE_MAX_LENGTH}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'slides-title-error' : undefined}
            className="min-h-11 w-full rounded-xs border border-transparent bg-transparent px-0 text-heading-2 text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-accent-orange-deep"
            {...register('title')}
          />
          <FieldError id="slides-title-error" message={errors.title?.message} />
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

      <div className="mt-md grid gap-md lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="rounded-lg border border-hairline bg-surface p-sm shadow-soft lg:sticky lg:top-md lg:self-start">
          <div className="flex items-center justify-between gap-sm px-xxs">
            <h2 className="text-title text-ink">Slides</h2>
            <span className="text-caption text-ink-muted">
              {slides.slides.length}/{SLIDES_MAX_SLIDES}
            </span>
          </div>

          <ol className="mt-sm flex flex-col gap-xxs" aria-label="Slides">
            {slides.slides.map((slide, index) => {
              const isActiveSlide = slide.id === activeSlide?.id

              return (
                <li key={slide.id} className="flex items-center gap-xxs">
                  <button
                    type="button"
                    onClick={() => setActiveSlideId(slide.id)}
                    aria-current={isActiveSlide ? 'true' : undefined}
                    aria-label={`Open slide ${index + 1}: ${getSlidePreviewText(slide.content)}`}
                    className={clsx(
                      'flex min-h-11 min-w-0 flex-1 items-center gap-xs rounded-md border px-xs py-xxs text-left text-body-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                      isActiveSlide
                        ? 'border-primary bg-canvas-soft text-ink'
                        : 'border-hairline bg-surface text-ink-muted hover:bg-canvas-soft hover:text-ink',
                    )}
                  >
                    <span className="shrink-0 text-eyebrow text-ink-faint">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {getSlidePreviewText(slide.content)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlide(slide.id, -1)}
                    disabled={index === 0}
                    aria-label={`Move slide ${index + 1} up`}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronUp className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlide(slide.id, 1)}
                    disabled={index === slides.slides.length - 1}
                    aria-label={`Move slide ${index + 1} down`}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronDown className="size-4" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ol>

          <Button
            variant="utility"
            onClick={addSlide}
            disabled={atMaxSlides}
            className="mt-sm w-full"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add slide
          </Button>
          {atMaxSlides && (
            <p className="mt-xxs text-caption text-ink-muted">
              Slides can have at most {SLIDES_MAX_SLIDES} slides.
            </p>
          )}
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <p className="text-caption text-ink-muted">
              Slide {effectiveIndex + 1} of {slides.slides.length}
            </p>
            <div className="flex flex-wrap items-center gap-xxs">
              <Button
                variant="utility"
                onClick={duplicateActiveSlide}
                disabled={!activeSlide || atMaxSlides}
              >
                <Copy className="size-4" aria-hidden="true" />
                Duplicate
              </Button>
              <Button
                variant="utility"
                onClick={deleteActiveSlide}
                disabled={!activeSlide || slides.slides.length <= 1}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Delete slide
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsPreviewOpen(true)}
                disabled={!activeSlide}
              >
                <Play className="size-4" aria-hidden="true" />
                Preview
              </Button>
            </div>
          </div>

          <div className="mt-sm">
            {activeSlide ? (
              <TopicAssetProvider assets={assets} refreshAsset={refreshAsset}>
                <RichTextEditor
                  content={activeSlide.content}
                  contentKey={activeSlide.id}
                  onChange={handleEditorChange}
                  variant="slide"
                  label={`Slide ${effectiveIndex + 1} content`}
                  placeholder="Start writing this slide…"
                  contentId={item.id}
                  accessToken={accessToken}
                  onAssetAdded={handleAssetAdded}
                />
              </TopicAssetProvider>
            ) : (
              <div className="rounded-lg border border-dashed border-hairline bg-canvas-soft p-xl text-center">
                <p className="text-body-sm text-ink-muted">
                  This presentation has no slides.
                </p>
                <Button variant="primary" onClick={addSlide} className="mt-sm">
                  Add the first slide
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isPreviewOpen && activeSlide && (
        <SlidePreviewDialog
          slides={slides}
          initialIndex={effectiveIndex}
          assets={assets}
          refreshAsset={refreshAsset}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  )
}

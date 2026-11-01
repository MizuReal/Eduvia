import { z } from 'zod'
import {
  ALT_TEXT_MAX_LENGTH,
  CONTENT_JSON_MAX_BYTES,
  CONTENT_TITLE_MAX_LENGTH,
  CONTENT_TITLE_MIN_LENGTH,
  LINK_URL_MAX_LENGTH,
  PRESENTATION_SUMMARY_MAX_LENGTH,
  PRESENTATION_SUMMARY_MIN_LENGTH,
  SLIDES_MAX_SLIDES,
} from '../config/content'
import type { SlidesDocument } from '../types/topicContent'

export const contentTitleSchema = z
  .string()
  .trim()
  .min(
    CONTENT_TITLE_MIN_LENGTH,
    `Use ${CONTENT_TITLE_MIN_LENGTH}–${CONTENT_TITLE_MAX_LENGTH} characters.`,
  )
  .max(
    CONTENT_TITLE_MAX_LENGTH,
    `Use ${CONTENT_TITLE_MIN_LENGTH}–${CONTENT_TITLE_MAX_LENGTH} characters.`,
  )

export const presentationSummarySchema = z
  .string()
  .trim()
  .min(
    PRESENTATION_SUMMARY_MIN_LENGTH,
    `Use ${PRESENTATION_SUMMARY_MIN_LENGTH}–${PRESENTATION_SUMMARY_MAX_LENGTH} characters.`,
  )
  .max(
    PRESENTATION_SUMMARY_MAX_LENGTH,
    `Use ${PRESENTATION_SUMMARY_MIN_LENGTH}–${PRESENTATION_SUMMARY_MAX_LENGTH} characters.`,
  )

export const contentTitleFormSchema = z.object({
  title: contentTitleSchema,
})

export const presentationFormSchema = z.object({
  title: contentTitleSchema,
  summary: presentationSummarySchema,
})

export const altTextSchema = z
  .string()
  .trim()
  .max(ALT_TEXT_MAX_LENGTH, `Use ${ALT_TEXT_MAX_LENGTH} characters or fewer for alt text.`)

export const linkUrlSchema = z
  .string()
  .trim()
  .min(1, 'Enter a link.')
  .max(LINK_URL_MAX_LENGTH, `Use ${LINK_URL_MAX_LENGTH} characters or fewer.`)
  .refine((value) => {
    try {
      const url = new URL(value)
      return ['http:', 'https:', 'mailto:'].includes(url.protocol)
    } catch {
      return false
    }
  }, 'Use an http, https, or mailto link.')

export type PresentationFormValues = z.infer<typeof presentationFormSchema>

function contentByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length
}

export function getSlidesSaveError(slides: SlidesDocument): string | null {
  if (slides.slides.length === 0) {
    return 'Add at least one slide before saving.'
  }

  if (slides.slides.length > SLIDES_MAX_SLIDES) {
    return `Slides can have at most ${SLIDES_MAX_SLIDES} slides.`
  }

  if (contentByteLength(slides) > CONTENT_JSON_MAX_BYTES) {
    return 'These slides are too large to save. Remove some content and try again.'
  }

  return null
}

export function getDocumentSaveError(content: unknown): string | null {
  if (contentByteLength(content) > CONTENT_JSON_MAX_BYTES) {
    return 'This document is too large to save. Remove some content and try again.'
  }

  return null
}

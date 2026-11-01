import type { JSONContent } from '@tiptap/react'
import { SLIDES_DOCUMENT_VERSION } from '../../config/content'
import type { Slide, SlidesDocument } from '../../types/topicContent'

export function createSlideId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (value) => {
    const random = Math.floor(Math.random() * 16)
    const nibble = value === 'x' ? random : (random & 0x3) | 0x8
    return nibble.toString(16)
  })
}

export function createEmptySlide(): Slide {
  return {
    id: createSlideId(),
    content: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 } },
        { type: 'paragraph' },
      ],
    },
  }
}

export function createEmptySlides(): SlidesDocument {
  return {
    version: SLIDES_DOCUMENT_VERSION,
    slides: [createEmptySlide()],
  }
}

export function duplicateSlide(slide: Slide): Slide {
  return {
    id: createSlideId(),
    content: structuredClone(slide.content),
  }
}

export function getSlidePreviewText(content: JSONContent): string {
  const parts: string[] = []

  const visit = (node: JSONContent) => {
    if (typeof node.text === 'string') {
      parts.push(node.text)
    }

    node.content?.forEach(visit)
  }

  visit(content)

  const text = parts.join(' ').replace(/\s+/g, ' ').trim()

  return text.length > 0 ? text.slice(0, 80) : 'Untitled slide'
}

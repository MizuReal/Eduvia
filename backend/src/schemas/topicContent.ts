import { z } from 'zod'
import {
  CONTENT_JSON_MAX_BYTES,
  CONTENT_TITLE_MAX_LENGTH,
  CONTENT_TITLE_MIN_LENGTH,
  PRESENTATION_SUMMARY_MIN_LENGTH,
  PRESENTATION_SUMMARY_MAX_LENGTH,
  SLIDES_DOCUMENT_VERSION,
  SLIDES_MAX_SLIDES,
  TIPTAP_MAX_DEPTH,
  TIPTAP_MAX_NODES,
  TIPTAP_MAX_TEXT_LENGTH,
} from '../config/constants.js'
import type { ErrorDetail } from '../errors/AppError.js'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ALLOWED_NODES = new Set([
  'doc',
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'hardBreak',
  'courseImage',
  'courseFile',
])

const ALLOWED_MARKS = new Set([
  'bold',
  'italic',
  'strike',
  'code',
  'underline',
  'link',
])

const LEAF_NODES = new Set([
  'hardBreak',
  'horizontalRule',
  'courseImage',
  'courseFile',
])

const INLINE_NODES = new Set(['text', 'hardBreak'])
const BLOCK_NODES = new Set([
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'courseImage',
  'courseFile',
])

const LIST_NODES = new Set(['bulletList', 'orderedList'])

type ValidationContext = {
  nodeCount: number
  textLength: number
  details: ErrorDetail[]
}

type NodeRule = {
  attributes: Record<string, (value: unknown) => boolean>
}

const NODE_RULES: Record<string, NodeRule> = {
  heading: {
    attributes: {
      level: (value) =>
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 3,
    },
  },
  codeBlock: {
    attributes: {
      language: (value) =>
        value === null || (typeof value === 'string' && value.length <= 50),
    },
  },
  orderedList: {
    attributes: {
      start: (value) =>
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 1 &&
        value <= 100_000,
      type: (value) => value === null || typeof value === 'string',
    },
  },
  bulletList: {
    attributes: {
      type: (value) => value === null || typeof value === 'string',
    },
  },
  courseImage: {
    attributes: {
      fileId: (value) => typeof value === 'string' && isUuid(value),
      alt: (value) =>
        value === null ||
        (typeof value === 'string' && value.length <= 250),
    },
  },
  courseFile: {
    attributes: {
      fileId: (value) => typeof value === 'string' && isUuid(value),
    },
  },
}

const MARK_RULES: Record<string, Record<string, (value: unknown) => boolean>> =
  {
    link: {
      href: (value) => typeof value === 'string' && isAllowedLinkHref(value),
      target: (value) => value === null || value === '_blank',
      rel: (value) => value === null || (typeof value === 'string' && value.length <= 100),
      class: (value) => value === null || (typeof value === 'string' && value.length <= 100),
    },
  }

export const contentIdParamSchema = z.object({
  contentId: z.string().uuid('Select a valid content item.'),
})

export const fileIdParamSchema = z.object({
  fileId: z.string().uuid('Select a valid file.'),
})

const contentTitleSchema = z
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

const presentationSummarySchema = z
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

export const contentKindSchema = z.enum(['slides', 'doc'])

export const contentKindParamSchema = z.object({
  kind: contentKindSchema,
})

export const updateContentSchema = z
  .strictObject({
    title: contentTitleSchema.optional(),
    content: z.unknown().optional(),
    summary: presentationSummarySchema.optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.content !== undefined ||
      value.summary !== undefined,
    {
      message: 'Provide a title, content, or summary.',
      path: ['title'],
    },
  )

export const presentationUploadSchema = z.strictObject({
  title: contentTitleSchema.optional(),
  summary: presentationSummarySchema,
})

export const assetUploadSchema = z.strictObject({
  kind: z.enum(['image', 'file']),
})

export type UpdateContentInput = z.infer<typeof updateContentSchema>
export type PresentationUploadInput = z.infer<typeof presentationUploadSchema>
export type AssetUploadInput = z.infer<typeof assetUploadSchema>
export type ContentKind = z.infer<typeof contentKindSchema>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

function isAllowedLinkHref(href: string): boolean {
  if (href.length > 2048) {
    return false
  }

  try {
    const url = new URL(href)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol)
  } catch {
    return false
  }
}

function pushDetail(
  context: ValidationContext,
  path: string,
  message: string,
): void {
  if (context.details.length >= 25) {
    return
  }

  context.details.push({ path, message })
}

function validateAttributes(
  node: Record<string, unknown>,
  path: string,
  context: ValidationContext,
): void {
  const type = node.type
  const attributes = node.attrs

  if (attributes === undefined) {
    return
  }

  if (!isRecord(attributes)) {
    pushDetail(context, `${path}.attrs`, 'Use a valid attribute object.')
    return
  }

  const rule = typeof type === 'string' ? NODE_RULES[type] : undefined
  const allowed = rule?.attributes ?? {}

  for (const [key, value] of Object.entries(attributes)) {
    const validator = allowed[key]

    if (!validator) {
      pushDetail(
        context,
        `${path}.attrs.${key}`,
        'This attribute is not supported.',
      )
      continue
    }

    if (value !== undefined && !validator(value)) {
      pushDetail(context, `${path}.attrs.${key}`, 'Use a valid value.')
    }
  }
}

function validateMarks(
  marks: unknown,
  path: string,
  context: ValidationContext,
): void {
  if (marks === undefined) {
    return
  }

  if (!Array.isArray(marks)) {
    pushDetail(context, `${path}.marks`, 'Use a list of marks.')
    return
  }

  marks.forEach((mark, index) => {
    const markPath = `${path}.marks[${index}]`

    if (!isRecord(mark)) {
      pushDetail(context, markPath, 'Use a valid mark.')
      return
    }

    if (typeof mark.type !== 'string' || !ALLOWED_MARKS.has(mark.type)) {
      pushDetail(context, `${markPath}.type`, 'This mark is not supported.')
      return
    }

    const attributes = mark.attrs

    if (attributes === undefined) {
      return
    }

    if (!isRecord(attributes)) {
      pushDetail(context, `${markPath}.attrs`, 'Use a valid attribute object.')
      return
    }

    const rules = MARK_RULES[mark.type] ?? {}

    for (const [key, value] of Object.entries(attributes)) {
      const validator = rules[key]

      if (!validator || typeof value === 'undefined' || !validator(value)) {
        pushDetail(
          context,
          `${markPath}.attrs.${key}`,
          'This link attribute is not supported.',
        )
      }
    }

    if (
      mark.type === 'link' &&
      (!isRecord(attributes) ||
        typeof attributes.href !== 'string' ||
        !isAllowedLinkHref(attributes.href))
    ) {
      pushDetail(context, `${markPath}.attrs.href`, 'Use a valid link.')
    }
  })
}

function validateChildren(
  children: unknown,
  allowed: Set<string>,
  path: string,
  depth: number,
  context: ValidationContext,
): void {
  if (!Array.isArray(children)) {
    pushDetail(context, path, 'Use a list of child nodes.')
    return
  }

  children.forEach((child, index) => {
    const childPath = `${path}[${index}]`

    if (
      !isRecord(child) ||
      typeof child.type !== 'string' ||
      !allowed.has(child.type)
    ) {
      pushDetail(context, childPath, 'This node is not allowed here.')
      return
    }

    validateNode(child, childPath, depth + 1, context)
  })
}

function validateNode(
  value: unknown,
  path: string,
  depth: number,
  context: ValidationContext,
): void {
  context.nodeCount += 1

  if (context.nodeCount > TIPTAP_MAX_NODES) {
    pushDetail(context, path, 'This content has too many nodes.')
    return
  }

  if (depth > TIPTAP_MAX_DEPTH) {
    pushDetail(context, path, 'This content is nested too deeply.')
    return
  }

  if (!isRecord(value)) {
    pushDetail(context, path, 'Use a valid content node.')
    return
  }

  const type = value.type

  if (typeof type !== 'string' || !ALLOWED_NODES.has(type)) {
    pushDetail(context, `${path}.type`, 'This content type is not supported.')
    return
  }

  validateAttributes(value, path, context)

  if (type === 'heading') {
    if (
      !isRecord(value.attrs) ||
      typeof value.attrs.level !== 'number' ||
      !NODE_RULES.heading?.attributes.level?.(value.attrs.level)
    ) {
      pushDetail(context, `${path}.attrs.level`, 'Use a heading level from 1 to 3.')
    }
  }

  if (type === 'courseImage' || type === 'courseFile') {
    if (
      !isRecord(value.attrs) ||
      typeof value.attrs.fileId !== 'string' ||
      !isUuid(value.attrs.fileId)
    ) {
      pushDetail(context, `${path}.attrs.fileId`, 'Use a valid file.')
    }
  }

  if (type === 'doc') {
    pushDetail(context, path, 'A document cannot be nested here.')
    return
  }

  if (type === 'text') {
    if (value.content !== undefined) {
      pushDetail(context, `${path}.content`, 'Text nodes cannot contain nodes.')
    }

    if (typeof value.text !== 'string') {
      pushDetail(context, `${path}.text`, 'Use valid text.')
    } else {
      context.textLength += value.text.length

      if (context.textLength > TIPTAP_MAX_TEXT_LENGTH) {
        pushDetail(context, path, 'This content has too much text.')
      }
    }

    validateMarks(value.marks, path, context)
    return
  }

  if (value.marks !== undefined) {
    pushDetail(context, `${path}.marks`, 'Only text nodes can be marked.')
  }

  if (LEAF_NODES.has(type)) {
    if (value.content !== undefined) {
      pushDetail(context, `${path}.content`, 'This node cannot contain nodes.')
    }
    return
  }

  const content = value.content

  if (content === undefined) {
    return
  }

  let allowedChildren = BLOCK_NODES

  if (type === 'paragraph' || type === 'heading') {
    allowedChildren = INLINE_NODES
  } else if (type === 'codeBlock') {
    allowedChildren = new Set(['text'])
  } else if (LIST_NODES.has(type)) {
    allowedChildren = new Set(['listItem'])
  } else if (type === 'listItem') {
    allowedChildren = new Set([
      'paragraph',
      'bulletList',
      'orderedList',
      'courseImage',
      'courseFile',
    ])
  } else if (type === 'blockquote') {
    allowedChildren = BLOCK_NODES
  }

  if (!Array.isArray(content)) {
    pushDetail(context, `${path}.content`, 'Use a list of child nodes.')
    return
  }

  content.forEach((child, index) => {
    const childPath = `${path}.content[${index}]`

    if (
      !isRecord(child) ||
      typeof child.type !== 'string' ||
      !allowedChildren.has(child.type)
    ) {
      pushDetail(context, childPath, 'This node is not allowed here.')
      return
    }

    validateNode(child, childPath, depth + 1, context)
  })
}

function createContext(): ValidationContext {
  return {
    nodeCount: 0,
    textLength: 0,
    details: [],
  }
}

function getByteLength(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

export function validateContentForKind(
  kind: 'doc' | 'slides',
  content: unknown,
): ErrorDetail[] {
  if (getByteLength(content) > CONTENT_JSON_MAX_BYTES) {
    return [{ path: 'content', message: 'This content is too large.' }]
  }

  const context = createContext()

  if (kind === 'doc') {
    validateDocument(content, 'content', context)
    return context.details
  }

  validateSlidesDocument(content, 'content', context)
  return context.details
}

function validateDocument(
  value: unknown,
  path: string,
  context: ValidationContext,
): void {
  if (!isRecord(value) || value.type !== 'doc') {
    pushDetail(context, path, 'Use a valid document.')
    return
  }

  const content = value.content

  if (content !== undefined) {
    validateChildren(content, BLOCK_NODES, `${path}.content`, 0, context)
  }
}

function validateSlidesDocument(
  value: unknown,
  path: string,
  context: ValidationContext,
): void {
  if (!isRecord(value)) {
    pushDetail(context, path, 'Use valid slides.')
    return
  }

  if (value.version !== SLIDES_DOCUMENT_VERSION) {
    pushDetail(context, `${path}.version`, 'Use a supported slides version.')
  }

  const slides = value.slides

  if (!Array.isArray(slides)) {
    pushDetail(context, `${path}.slides`, 'Use a list of slides.')
    return
  }

  if (slides.length < 1 || slides.length > SLIDES_MAX_SLIDES) {
    pushDetail(
      context,
      `${path}.slides`,
      `Use between 1 and ${SLIDES_MAX_SLIDES} slides.`,
    )
  }

  const ids = new Set<string>()

  slides.forEach((slide, index) => {
    const slidePath = `${path}.slides[${index}]`

    if (!isRecord(slide)) {
      pushDetail(context, slidePath, 'Use a valid slide.')
      return
    }

    if (typeof slide.id !== 'string' || !isUuid(slide.id)) {
      pushDetail(context, `${slidePath}.id`, 'Use a valid slide id.')
    } else if (ids.has(slide.id)) {
      pushDetail(context, `${slidePath}.id`, 'Slide ids must be unique.')
    } else {
      ids.add(slide.id)
    }

    validateDocument(slide.content, `${slidePath}.content`, context)
  })
}

export type AssetReference = {
  fileId: string
  nodeType: 'courseImage' | 'courseFile'
}

export function extractAssetReferences(
  kind: 'doc' | 'slides',
  content: unknown,
): AssetReference[] {
  const references: AssetReference[] = []

  const visitNode = (value: unknown): void => {
    if (!isRecord(value)) {
      return
    }

    if (
      (value.type === 'courseImage' || value.type === 'courseFile') &&
      isRecord(value.attrs) &&
      typeof value.attrs.fileId === 'string'
    ) {
      references.push({
        fileId: value.attrs.fileId,
        nodeType: value.type,
      })
    }

    if (Array.isArray(value.content)) {
      value.content.forEach(visitNode)
    }
  }

  if (kind === 'doc') {
    visitNode(content)
  } else if (isRecord(content) && Array.isArray(content.slides)) {
    content.slides.forEach((slide) => {
      if (isRecord(slide)) {
        visitNode(slide.content)
      }
    })
  }

  return references
}

import { describe, expect, it } from 'vitest'
import {
  extractAssetReferences,
  validateContentForKind,
} from '../src/schemas/topicContent.js'

const fileId = '33333333-3333-4333-8333-333333333333'
const secondFileId = '44444444-4444-4444-8444-444444444444'

describe('Tiptap content validation', () => {
  it('accepts supported document nodes and marks', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Learning goals' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    { type: 'text', text: 'Read the chapter' },
                    {
                      type: 'text',
                      text: ' and take notes',
                      marks: [
                        { type: 'bold' },
                        {
                          type: 'link',
                          attrs: {
                            href: 'https://example.com/notes',
                            target: '_blank',
                            rel: 'noopener noreferrer nofollow',
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        { type: 'horizontalRule' },
      ],
    }

    expect(validateContentForKind('doc', content)).toEqual([])
  })

  it('rejects unsupported nodes', () => {
    const details = validateContentForKind('doc', {
      type: 'doc',
      content: [{ type: 'script', content: [] }],
    })

    expect(details.length).toBeGreaterThan(0)
    expect(details[0]?.message).toMatch(/not supported|not allowed/i)
  })

  it('rejects unsafe link protocols', () => {
    const details = validateContentForKind('doc', {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Click me',
              marks: [
                {
                  type: 'link',
                  attrs: { href: 'javascript:alert(1)' },
                },
              ],
            },
          ],
        },
      ],
    })

    expect(details.some((detail) => detail.path.includes('href'))).toBe(true)
  })

  it('accepts image and file attachment nodes with valid ids', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'courseImage',
          attrs: { fileId, alt: null },
        },
        {
          type: 'courseFile',
          attrs: { fileId: secondFileId },
        },
      ],
    }

    expect(validateContentForKind('doc', content)).toEqual([])
    expect(extractAssetReferences('doc', content)).toEqual([
      { fileId, nodeType: 'courseImage' },
      { fileId: secondFileId, nodeType: 'courseFile' },
    ])
  })

  it('rejects asset nodes without a valid file id', () => {
    const details = validateContentForKind('doc', {
      type: 'doc',
      content: [
        { type: 'courseImage', attrs: { alt: 'Diagram' } },
        { type: 'courseFile', attrs: { fileId: 'not-a-uuid' } },
      ],
    })

    expect(
      details.filter((detail) => detail.path.includes('fileId')).length,
    ).toBeGreaterThanOrEqual(2)
  })

  it('rejects duplicate slide ids', () => {
    const slide = {
      id: '11111111-1111-4111-8111-111111111111',
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    }
    const details = validateContentForKind('slides', {
      version: 1,
      slides: [slide, slide],
    })

    expect(details.some((detail) => detail.message.includes('unique'))).toBe(
      true,
    )
  })

  it('rejects empty slides and unsupported versions', () => {
    const details = validateContentForKind('slides', {
      version: 2,
      slides: [],
    })

    expect(details.some((detail) => detail.path.endsWith('version'))).toBe(true)
    expect(details.some((detail) => detail.path.endsWith('slides'))).toBe(true)
  })

  it('rejects oversized content', () => {
    const details = validateContentForKind('doc', {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'x'.repeat(600_000) }],
        },
      ],
    })

    expect(details[0]?.message).toMatch(/too large/i)
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SlidesEditorPanel } from '../components/content/SlidesEditorPanel'

const contentMocks = vi.hoisted(() => ({
  updateContent: vi.fn(),
  getFileUrl: vi.fn(),
}))

vi.mock('../services/topicContentService', () => ({
  updateContent: contentMocks.updateContent,
  getFileUrl: contentMocks.getFileUrl,
}))

const editedSlideContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Edited slide' }],
    },
  ],
}

vi.mock('../components/content/RichTextEditor', () => ({
  RichTextEditor: ({
    contentKey,
    onChange,
  }: {
    contentKey: string
    onChange: (content: unknown) => void
  }) => (
    <div>
      <p>Editing slide {contentKey}</p>
      <button type="button" onClick={() => onChange(editedSlideContent)}>
        Edit slide
      </button>
    </div>
  ),
}))

vi.mock('../components/content/SlidePreviewDialog', () => ({
  SlidePreviewDialog: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Slide preview">
      <button type="button" onClick={onClose}>
        Close preview
      </button>
    </div>
  ),
}))

const courseId = 'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8'
const topicId = '11111111-1111-4111-8111-111111111111'
const contentId = '22222222-2222-4222-8222-222222222222'
const slideOneId = '33333333-3333-4333-8333-333333333333'
const slideTwoId = '44444444-4444-4444-8444-444444444444'
const timestamp = '2026-11-02T00:00:00.000Z'

const emptyDoc = { type: 'doc', content: [{ type: 'paragraph' }] }

const slidesItem = {
  id: contentId,
  courseId,
  topicId,
  kind: 'slides' as const,
  title: 'Week 1',
  content: {
    version: 1 as const,
    slides: [
      { id: slideOneId, content: emptyDoc },
      { id: slideTwoId, content: emptyDoc },
    ],
  },
  summary: null,
  file: null,
  assets: [],
  orderIndex: 0,
  slideCount: 2,
  createdAt: timestamp,
  updatedAt: timestamp,
}

function renderPanel() {
  const onSaved = vi.fn()
  const onDirtyChange = vi.fn()

  render(
    <SlidesEditorPanel
      item={slidesItem}
      accessToken="test-token"
      isActive
      onSaved={onSaved}
      onDirtyChange={onDirtyChange}
    />,
  )

  return { onSaved, onDirtyChange }
}

describe('SlidesEditorPanel', () => {
  beforeEach(() => {
    Object.values(contentMocks).forEach((mock) => mock.mockReset())
    contentMocks.updateContent.mockImplementation(
      (_contentId: string, input: { title: string; content: unknown }) =>
        Promise.resolve({
          ...slidesItem,
          title: input.title,
          content: input.content,
        }),
    )
  })

  it('loads and switches slides', async () => {
    const user = userEvent.setup()
    renderPanel()

    expect(screen.getByLabelText('Slides title')).toHaveValue('Week 1')
    expect(screen.getByText(`Editing slide ${slideOneId}`)).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: /open slide 2: untitled slide/i,
      }),
    )

    expect(screen.getByText(`Editing slide ${slideTwoId}`)).toBeInTheDocument()
  })

  it('adds a slide, saves the whole presentation, and reports dirty state', async () => {
    const user = userEvent.setup()
    const { onSaved, onDirtyChange } = renderPanel()

    expect(screen.getByText('2/80')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /add slide/i }))
    expect(screen.getByText('3/80')).toBeInTheDocument()
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(contentMocks.updateContent).toHaveBeenCalled()
    })
    const input = contentMocks.updateContent.mock.calls[0]?.[1] as {
      content: { slides: unknown[] }
    }
    expect(input.content.slides).toHaveLength(3)
    expect(onSaved).toHaveBeenCalled()
  })

  it('reorders slides before saving', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: /move slide 2 up/i }))
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(contentMocks.updateContent).toHaveBeenCalled()
    })
    const input = contentMocks.updateContent.mock.calls[0]?.[1] as {
      content: { slides: { id: string }[] }
    }
    expect(input.content.slides[0]?.id).toBe(slideTwoId)
  })

  it('keeps at least one slide and opens preview', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: /delete slide/i }))
    expect(screen.getByText('1/80')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /delete slide/i }),
    ).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /preview/i }))
    expect(
      await screen.findByRole('dialog', { name: /slide preview/i }),
    ).toBeInTheDocument()
  })
})

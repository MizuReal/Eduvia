import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DocsEditorPanel } from '../components/content/DocsEditorPanel'

const contentMocks = vi.hoisted(() => ({
  updateContent: vi.fn(),
  getFileUrl: vi.fn(),
}))

vi.mock('../services/topicContentService', () => ({
  updateContent: contentMocks.updateContent,
  getFileUrl: contentMocks.getFileUrl,
}))

const editedContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Edited content' }],
    },
  ],
}

vi.mock('../components/content/RichTextEditor', () => ({
  RichTextEditor: ({
    onChange,
  }: {
    onChange: (content: unknown) => void
  }) => (
    <div>
      <button type="button" onClick={() => onChange(editedContent)}>
        Edit content
      </button>
    </div>
  ),
}))

const courseId = 'c7c39a20-96a2-4c7e-9d29-37b60a8d9ae8'
const topicId = '11111111-1111-4111-8111-111111111111'
const contentId = '22222222-2222-4222-8222-222222222222'
const timestamp = '2026-11-02T00:00:00.000Z'

const docItem = {
  id: contentId,
  courseId,
  topicId,
  kind: 'doc' as const,
  title: 'Reading notes',
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  summary: null,
  file: null,
  assets: [],
  orderIndex: 0,
  slideCount: null,
  createdAt: timestamp,
  updatedAt: timestamp,
}

function renderPanel() {
  const onSaved = vi.fn()
  const onDirtyChange = vi.fn()

  render(
    <DocsEditorPanel
      item={docItem}
      accessToken="test-token"
      isActive
      onSaved={onSaved}
      onDirtyChange={onDirtyChange}
    />,
  )

  return { onSaved, onDirtyChange }
}

describe('DocsEditorPanel', () => {
  beforeEach(() => {
    Object.values(contentMocks).forEach((mock) => mock.mockReset())
    contentMocks.updateContent.mockResolvedValue({
      ...docItem,
      content: editedContent,
    })
  })

  it('saves edited content and reports dirty state', async () => {
    const user = userEvent.setup()
    const { onSaved, onDirtyChange } = renderPanel()

    expect(screen.getByLabelText('Document title')).toHaveValue(
      'Reading notes',
    )

    await user.click(screen.getByRole('button', { name: 'Edit content' }))
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(contentMocks.updateContent).toHaveBeenCalledWith(
        contentId,
        { title: 'Reading notes', content: editedContent },
        'test-token',
      )
    })
    expect(await screen.findByText('All changes saved')).toBeInTheDocument()
    expect(onSaved).toHaveBeenCalled()
  })

  it('rejects an empty title before saving', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.clear(screen.getByLabelText('Document title'))
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(
      await screen.findByText(/use 2–160 characters/i),
    ).toBeInTheDocument()
    expect(contentMocks.updateContent).not.toHaveBeenCalled()
  })
})

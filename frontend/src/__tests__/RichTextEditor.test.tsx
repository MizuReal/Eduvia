import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RichTextEditor } from '../components/content/RichTextEditor'

const initialContent = { type: 'doc', content: [{ type: 'paragraph' }] }
const imageId = '33333333-3333-4333-8333-333333333333'
const fileId = '44444444-4444-4444-8444-444444444444'

const editorMocks = vi.hoisted(() => {
  const insertContent = vi.fn()
  const chain = {
    focus: vi.fn(),
    insertContent,
    run: vi.fn(),
  }
  chain.focus.mockReturnValue(chain)
  chain.insertContent.mockReturnValue(chain)
  chain.run.mockReturnValue(true)

  return {
    chain,
    insertContent,
    editor: {
      chain: () => chain,
      getJSON: () => initialContent,
      commands: {
        setContent: vi.fn(),
      },
    },
  }
})

vi.mock('@tiptap/react', () => ({
  useEditor: () => editorMocks.editor,
  EditorContent: () => <div data-testid="editor-content" />,
}))

vi.mock('../components/content/EditorToolbar', () => ({
  EditorToolbar: ({
    onInsertImage,
    onAttachFile,
  }: {
    onInsertImage: () => void
    onAttachFile: () => void
  }) => (
    <div>
      <button type="button" onClick={onInsertImage}>
        Open image
      </button>
      <button type="button" onClick={onAttachFile}>
        Open file
      </button>
    </div>
  ),
}))

vi.mock('../components/content/InsertAssetDialog', () => ({
  InsertAssetDialog: ({
    kind,
    onInserted,
  }: {
    kind: 'image' | 'file'
    onInserted: (
      asset: { id: string; fileClass: 'image' | 'document' },
      alt: string,
    ) => void
  }) => (
    <button
      type="button"
      onClick={() =>
        onInserted(
          {
            id: kind === 'image' ? '33333333-3333-4333-8333-333333333333' : '44444444-4444-4444-8444-444444444444',
            fileClass: kind === 'image' ? 'image' : 'document',
          },
          'Alt text',
        )
      }
    >
      Confirm {kind}
    </button>
  ),
}))

function renderEditor() {
  const onAssetAdded = vi.fn()
  const onChange = vi.fn()

  render(
    <RichTextEditor
      content={initialContent}
      contentKey="doc-1"
      onChange={onChange}
      variant="doc"
      label="Document content"
      placeholder="Start writing"
      contentId="22222222-2222-4222-8222-222222222222"
      accessToken="test-token"
      onAssetAdded={onAssetAdded}
    />,
  )

  return { onAssetAdded, onChange }
}

describe('RichTextEditor asset insertion', () => {
  beforeEach(() => {
    editorMocks.insertContent.mockClear()
    editorMocks.chain.focus.mockClear()
    editorMocks.chain.run.mockClear()
  })

  it('inserts an image node with alt text', async () => {
    const user = userEvent.setup()
    const { onAssetAdded } = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Open image' }))
    await user.click(screen.getByRole('button', { name: 'Confirm image' }))

    expect(onAssetAdded).toHaveBeenCalledWith(
      expect.objectContaining({ id: imageId, fileClass: 'image' }),
    )
    expect(editorMocks.insertContent).toHaveBeenCalledWith({
      type: 'courseImage',
      attrs: { fileId: imageId, alt: 'Alt text' },
    })
  })

  it('inserts a file node', async () => {
    const user = userEvent.setup()
    const { onAssetAdded } = renderEditor()

    await user.click(screen.getByRole('button', { name: 'Open file' }))
    await user.click(screen.getByRole('button', { name: 'Confirm file' }))

    expect(onAssetAdded).toHaveBeenCalledWith(
      expect.objectContaining({ id: fileId, fileClass: 'document' }),
    )
    expect(editorMocks.insertContent).toHaveBeenCalledWith({
      type: 'courseFile',
      attrs: { fileId },
    })
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Editor } from '@tiptap/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorToolbar } from '../components/content/EditorToolbar'

const toolbarState = vi.hoisted(() => ({
  canUndo: true,
  canRedo: false,
  bold: false,
  canBold: true,
  italic: false,
  canItalic: true,
  underline: false,
  canUnderline: true,
  strike: false,
  canStrike: true,
  code: false,
  canCode: true,
  bulletList: false,
  canBulletList: true,
  orderedList: false,
  canOrderedList: true,
  blockquote: false,
  canBlockquote: true,
  codeBlock: false,
  canCodeBlock: true,
  link: false,
  canLink: true,
  headingLevel: 'paragraph',
  linkHref: '',
}))

vi.mock('@tiptap/react', () => ({
  useEditorState: () => toolbarState,
}))

function createEditor() {
  const run = vi.fn().mockReturnValue(true)
  const chain = {
    focus: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    toggleBold: vi.fn(),
    toggleItalic: vi.fn(),
    toggleUnderline: vi.fn(),
    toggleStrike: vi.fn(),
    toggleCode: vi.fn(),
    toggleBulletList: vi.fn(),
    toggleOrderedList: vi.fn(),
    toggleBlockquote: vi.fn(),
    toggleCodeBlock: vi.fn(),
    setHorizontalRule: vi.fn(),
    unsetAllMarks: vi.fn(),
    clearNodes: vi.fn(),
    extendMarkRange: vi.fn(),
    setLink: vi.fn(),
    unsetLink: vi.fn(),
    setParagraph: vi.fn(),
    toggleHeading: vi.fn(),
    run,
  }

  for (const value of Object.values(chain)) {
    if (typeof value === 'function' && value !== run) {
      value.mockReturnValue(chain)
    }
  }

  const editor = {
    chain: () => chain,
  }

  return { editor: editor as unknown as Editor, chain }
}

describe('EditorToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('wires format actions and asset insert buttons', async () => {
    const user = userEvent.setup()
    const { editor, chain } = createEditor()
    const onInsertImage = vi.fn()
    const onAttachFile = vi.fn()

    render(
      <EditorToolbar
        editor={editor}
        onInsertImage={onInsertImage}
        onAttachFile={onAttachFile}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Bold' }))
    expect(chain.toggleBold).toHaveBeenCalled()
    expect(chain.run).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Insert image' }))
    expect(onInsertImage).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Attach file' }))
    expect(onAttachFile).toHaveBeenCalled()
  })

  it('applies a link from the link dialog', async () => {
    const user = userEvent.setup()
    const { editor, chain } = createEditor()

    render(
      <EditorToolbar
        editor={editor}
        onInsertImage={vi.fn()}
        onAttachFile={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add link' }))

    const input = await screen.findByLabelText('Link address')
    await user.type(input, 'https://example.com/resource')
    await user.click(screen.getByRole('button', { name: 'Save link' }))

    expect(chain.extendMarkRange).toHaveBeenCalledWith('link')
    expect(chain.setLink).toHaveBeenCalledWith({
      href: 'https://example.com/resource',
    })
  })
})

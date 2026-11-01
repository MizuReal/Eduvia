import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import clsx from 'clsx'
import {
  Bold,
  Braces,
  Code2,
  Eraser,
  Image as ImageIcon,
  Italic,
  Link2,
  List as ListIcon,
  ListOrdered,
  Minus,
  Paperclip,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react'
import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { LinkDialog } from './LinkDialog'

type EditorToolbarProps = {
  editor: Editor | null
  onInsertImage: () => void
  onAttachFile: () => void
}

type ToolbarButtonProps = {
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: ReactNode
}

function ToolbarButton({
  label,
  onClick,
  disabled = false,
  active,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-canvas-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40',
        active && 'bg-canvas-soft text-ink',
      )}
    >
      {children}
    </button>
  )
}

function ToolbarSeparator() {
  return (
    <span
      aria-hidden="true"
      className="mx-xxs h-6 w-px shrink-0 bg-hairline"
    />
  )
}

export function EditorToolbar({
  editor,
  onInsertImage,
  onAttachFile,
}: EditorToolbarProps) {
  const headingId = useId()
  const [isLinkOpen, setIsLinkOpen] = useState(false)

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) {
        return null
      }

      return {
        canUndo: current.can().chain().focus().undo().run(),
        canRedo: current.can().chain().focus().redo().run(),
        bold: current.isActive('bold'),
        canBold: current.can().chain().focus().toggleBold().run(),
        italic: current.isActive('italic'),
        canItalic: current.can().chain().focus().toggleItalic().run(),
        underline: current.isActive('underline'),
        canUnderline: current.can().chain().focus().toggleUnderline().run(),
        strike: current.isActive('strike'),
        canStrike: current.can().chain().focus().toggleStrike().run(),
        code: current.isActive('code'),
        canCode: current.can().chain().focus().toggleCode().run(),
        bulletList: current.isActive('bulletList'),
        canBulletList: current.can().chain().focus().toggleBulletList().run(),
        orderedList: current.isActive('orderedList'),
        canOrderedList: current.can().chain().focus().toggleOrderedList().run(),
        blockquote: current.isActive('blockquote'),
        canBlockquote: current.can().chain().focus().toggleBlockquote().run(),
        codeBlock: current.isActive('codeBlock'),
        canCodeBlock: current.can().chain().focus().toggleCodeBlock().run(),
        link: current.isActive('link'),
        canLink: current.can().chain().focus().setLink({ href: 'https://example.com' }).run(),
        headingLevel: current.isActive('heading', { level: 1 })
          ? '1'
          : current.isActive('heading', { level: 2 })
            ? '2'
            : current.isActive('heading', { level: 3 })
              ? '3'
              : 'paragraph',
        linkHref:
          typeof current.getAttributes('link').href === 'string'
            ? current.getAttributes('link').href
            : '',
      }
    },
  })

  const headingValue = state?.headingLevel ?? 'paragraph'

  return (
    <>
      <div
        role="toolbar"
        aria-label="Text formatting"
        className="flex flex-wrap items-center gap-xxs border-b border-hairline bg-surface p-xs"
      >
        <ToolbarButton
          label="Undo"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!state?.canUndo}
        >
          <Undo2 className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!state?.canRedo}
        >
          <Redo2 className="size-4" aria-hidden="true" />
        </ToolbarButton>

        <ToolbarSeparator />

        <label htmlFor={headingId} className="sr-only">
          Text style
        </label>
        <select
          id={headingId}
          value={headingValue}
          onChange={(event) => {
            const value = event.target.value

            if (value === 'paragraph') {
              editor?.chain().focus().setParagraph().run()
              return
            }

            editor
              ?.chain()
              .focus()
              .toggleHeading({ level: Number(value) as 1 | 2 | 3 })
              .run()
          }}
          className="min-h-11 rounded-md border border-hairline bg-surface px-xs text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <option value="paragraph">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>

        <ToolbarSeparator />

        <ToolbarButton
          label="Bold"
          active={state?.bold}
          disabled={!state?.canBold}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={state?.italic}
          disabled={!state?.canItalic}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={state?.underline}
          disabled={!state?.canUnderline}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <Underline className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={state?.strike}
          disabled={!state?.canStrike}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Inline code"
          active={state?.code}
          disabled={!state?.canCode}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          <Code2 className="size-4" aria-hidden="true" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          label="Bulleted list"
          active={state?.bulletList}
          disabled={!state?.canBulletList}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <ListIcon className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={state?.orderedList}
          disabled={!state?.canOrderedList}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Blockquote"
          active={state?.blockquote}
          disabled={!state?.canBlockquote}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Code block"
          active={state?.codeBlock}
          disabled={!state?.canCodeBlock}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        >
          <Braces className="size-4" aria-hidden="true" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          label={state?.link ? 'Edit link' : 'Add link'}
          active={state?.link}
          disabled={!state?.canLink && !state?.link}
          onClick={() => setIsLinkOpen(true)}
        >
          <Link2 className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Insert image"
          onClick={onInsertImage}
        >
          <ImageIcon className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Attach file"
          onClick={onAttachFile}
        >
          <Paperclip className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Horizontal rule"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="size-4" aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton
          label="Clear formatting"
          onClick={() =>
            editor?.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          <Eraser className="size-4" aria-hidden="true" />
        </ToolbarButton>
      </div>

      {isLinkOpen && (
        <LinkDialog
          initialValue={state?.linkHref ?? ''}
          onSave={(href) => {
            editor
              ?.chain()
              .focus()
              .extendMarkRange('link')
              .setLink({ href })
              .run()
            setIsLinkOpen(false)
          }}
          onRemove={
            state?.link
              ? () => {
                  editor
                    ?.chain()
                    .focus()
                    .extendMarkRange('link')
                    .unsetLink()
                    .run()
                  setIsLinkOpen(false)
                }
              : undefined
          }
          onClose={() => setIsLinkOpen(false)}
        />
      )}
    </>
  )
}

import { EditorContent, useEditor } from '@tiptap/react'
import clsx from 'clsx'
import { useEffect } from 'react'
import type { JSONContent } from '@tiptap/react'
import { createEditorExtensions } from './editorExtensions'
import {
  DOC_RENDER_CONTENT_CLASSES,
  SLIDE_RENDER_CONTENT_CLASSES,
} from './editorStyles'

const RENDER_EXTENSIONS = createEditorExtensions('')

type TiptapRendererProps = {
  content: JSONContent
  variant: 'doc' | 'slide'
  label: string
  className?: string
}

export function TiptapRenderer({
  content,
  variant,
  label,
  className,
}: TiptapRendererProps) {
  const editor = useEditor({
    extensions: RENDER_EXTENSIONS,
    content,
    editable: false,
    editorProps: {
      attributes: {
        'aria-label': label,
        'aria-readonly': 'true',
      },
    },
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  return (
    <EditorContent
      editor={editor}
      className={clsx(
        variant === 'doc'
          ? DOC_RENDER_CONTENT_CLASSES
          : SLIDE_RENDER_CONTENT_CLASSES,
        className,
      )}
    />
  )
}

import { EditorContent, useEditor } from '@tiptap/react'
import type { JSONContent } from '@tiptap/react'
import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TopicAsset } from '../../types/topicContent'
import { EditorToolbar } from './EditorToolbar'
import { createEditorExtensions } from './editorExtensions'
import {
  DOC_EDITOR_CONTENT_CLASSES,
  SLIDE_EDITOR_CONTENT_CLASSES,
} from './editorStyles'
import { InsertAssetDialog } from './InsertAssetDialog'

type RichTextEditorProps = {
  content: JSONContent
  contentKey: string
  onChange: (content: JSONContent) => void
  variant: 'doc' | 'slide'
  label: string
  placeholder: string
  contentId: string
  accessToken: string
  onAssetAdded: (asset: TopicAsset) => void
}

export function RichTextEditor({
  content,
  contentKey,
  onChange,
  variant,
  label,
  placeholder,
  contentId,
  accessToken,
  onAssetAdded,
}: RichTextEditorProps) {
  const extensions = useMemo(
    () => createEditorExtensions(placeholder),
    [placeholder],
  )
  const lastEmittedRef = useRef(JSON.stringify(content))
  const lastKeyRef = useRef(contentKey)
  const onChangeRef = useRef(onChange)
  const [assetDialogKind, setAssetDialogKind] = useState<
    'image' | 'file' | null
  >(null)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const editor = useEditor({
    extensions,
    content,
    editorProps: {
      attributes: {
        'aria-label': label,
        'aria-multiline': 'true',
        role: 'textbox',
      },
    },
    onUpdate: ({ editor: current }) => {
      const next = current.getJSON()
      lastEmittedRef.current = JSON.stringify(next)
      onChangeRef.current(next)
    },
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    const keyChanged = lastKeyRef.current !== contentKey
    lastKeyRef.current = contentKey
    const next = JSON.stringify(content)

    if (!keyChanged && next === lastEmittedRef.current) {
      return
    }

    editor.commands.setContent(content, { emitUpdate: false })
    lastEmittedRef.current = next
  }, [content, contentKey, editor])

  const insertAsset = (asset: TopicAsset, alt: string) => {
    onAssetAdded(asset)

    if (!editor) {
      return
    }

    const node =
      asset.fileClass === 'image'
        ? {
            type: 'courseImage',
            attrs: {
              fileId: asset.id,
              alt: alt.length > 0 ? alt : null,
            },
          }
        : {
            type: 'courseFile',
            attrs: {
              fileId: asset.id,
            },
          }

    editor.chain().focus().insertContent(node).run()
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-hairline bg-surface shadow-soft focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <EditorToolbar
          editor={editor}
          onInsertImage={() => setAssetDialogKind('image')}
          onAttachFile={() => setAssetDialogKind('file')}
        />
        <EditorContent
          editor={editor}
          className={clsx(
            variant === 'doc'
              ? DOC_EDITOR_CONTENT_CLASSES
              : SLIDE_EDITOR_CONTENT_CLASSES,
            'px-lg py-md',
          )}
        />
      </div>

      {assetDialogKind && (
        <InsertAssetDialog
          kind={assetDialogKind}
          contentId={contentId}
          accessToken={accessToken}
          onClose={() => setAssetDialogKind(null)}
          onInserted={(asset, alt) => {
            insertAsset(asset, alt)
            setAssetDialogKind(null)
          }}
        />
      )}
    </>
  )
}

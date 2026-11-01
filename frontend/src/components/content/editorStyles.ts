const BASE_CONTENT_CLASSES = [
  '[&_.ProseMirror]:outline-none',
  '[&_.ProseMirror]:leading-relaxed',
  '[&_.ProseMirror>*:first-child]:mt-0',
  '[&_.ProseMirror>*:last-child]:mb-0',
  '[&_.ProseMirror_p]:my-xs',
  '[&_.ProseMirror_h1]:mt-lg [&_.ProseMirror_h1]:mb-sm [&_.ProseMirror_h1]:text-heading-1',
  '[&_.ProseMirror_h2]:mt-md [&_.ProseMirror_h2]:mb-xs [&_.ProseMirror_h2]:text-heading-2',
  '[&_.ProseMirror_h3]:mt-md [&_.ProseMirror_h3]:mb-xs [&_.ProseMirror_h3]:text-heading-3',
  '[&_.ProseMirror_ul]:my-xs [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-lg',
  '[&_.ProseMirror_ol]:my-xs [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-lg',
  '[&_.ProseMirror_li]:my-xxs',
  '[&_.ProseMirror_li>p]:my-0',
  '[&_.ProseMirror_blockquote]:my-sm [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-hairline [&_.ProseMirror_blockquote]:pl-md [&_.ProseMirror_blockquote]:text-ink-secondary',
  '[&_.ProseMirror_code]:rounded-xs [&_.ProseMirror_code]:bg-canvas-soft [&_.ProseMirror_code]:px-xxs [&_.ProseMirror_code]:py-[0.1rem] [&_.ProseMirror_code]:font-mono [&_.ProseMirror_code]:text-caption',
  '[&_.ProseMirror_pre]:my-sm [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-md [&_.ProseMirror_pre]:bg-ink [&_.ProseMirror_pre]:p-sm [&_.ProseMirror_pre]:text-caption [&_.ProseMirror_pre]:text-on-primary',
  '[&_.ProseMirror_pre_code]:bg-transparent [&_.ProseMirror_pre_code]:p-0 [&_.ProseMirror_pre_code]:text-inherit',
  '[&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:underline-offset-2',
  '[&_.ProseMirror_hr]:my-md [&_.ProseMirror_hr]:border-hairline',
  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-ink-faint',
  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
].join(' ')

export const DOC_EDITOR_CONTENT_CLASSES = `${BASE_CONTENT_CLASSES} [&_.ProseMirror]:text-body-md [&_.ProseMirror]:min-h-[26rem] [&_.ProseMirror]:max-w-[70ch]`

export const SLIDE_EDITOR_CONTENT_CLASSES = `${BASE_CONTENT_CLASSES} [&_.ProseMirror]:text-title [&_.ProseMirror]:min-h-[18rem] [&_.ProseMirror_li]:text-title`

export const DOC_RENDER_CONTENT_CLASSES = `${BASE_CONTENT_CLASSES} [&_.ProseMirror]:text-body-md [&_.ProseMirror]:max-w-[70ch]`

export const SLIDE_RENDER_CONTENT_CLASSES = `${BASE_CONTENT_CLASSES} [&_.ProseMirror]:text-title [&_.ProseMirror_li]:text-title`

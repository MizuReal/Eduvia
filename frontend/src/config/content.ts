export const CONTENT_TITLE_MIN_LENGTH = 2
export const CONTENT_TITLE_MAX_LENGTH = 160
export const PRESENTATION_SUMMARY_MIN_LENGTH = 20
export const PRESENTATION_SUMMARY_MAX_LENGTH = 1000
export const ALT_TEXT_MAX_LENGTH = 250
export const LINK_URL_MAX_LENGTH = 2048

export const SLIDES_DOCUMENT_VERSION = 1
export const SLIDES_MAX_SLIDES = 80

export const CONTENT_JSON_MAX_BYTES = 512 * 1024
export const CONTENT_MAX_ASSETS = 50

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024

export const UPLOAD_TIMEOUT_MS = 120_000
export const PROGRESS_ANNOUNCEMENT_STEP = 10

export const IMAGE_ACCEPT: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

export const DOCUMENT_ACCEPT: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    '.pptx',
  ],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
}

export const PRESENTATION_ACCEPT: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    '.pptx',
  ],
}

export const IMAGE_ACCEPT_LABEL = 'JPG, PNG, or WebP'
export const DOCUMENT_ACCEPT_LABEL = 'PDF, DOCX, PPTX, TXT, or MD'
export const PRESENTATION_ACCEPT_LABEL = 'PPTX or PDF'

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatContentDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

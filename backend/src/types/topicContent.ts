export type TopicContentKind = 'slides' | 'doc' | 'presentation'
export type FileClass = 'image' | 'document'
export type FileStatus =
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'quarantined'

export type TiptapMark = {
  type: string
  attrs?: Record<string, unknown>
}

export type TiptapNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  marks?: TiptapMark[]
  text?: string
}

export type TiptapDoc = {
  type: 'doc'
  content?: TiptapNode[]
}

export type Slide = {
  id: string
  content: TiptapDoc
}

export type SlidesDocument = {
  version: 1
  slides: Slide[]
}

export type TopicFile = {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  fileClass: FileClass
  width: number | null
  height: number | null
  status: FileStatus
}

export type TopicAsset = TopicFile & {
  url: string | null
  expiresAt: string
}

export type TopicContentSummary = {
  id: string
  courseId: string
  topicId: string
  kind: TopicContentKind
  title: string
  orderIndex: number
  slideCount: number | null
  summary: string | null
  file: TopicFile | null
  createdAt: string
  updatedAt: string
}

export type DocContentItem = TopicContentSummary & {
  kind: 'doc'
  content: TiptapDoc
  summary: null
  file: null
  assets: TopicAsset[]
}

export type SlidesContentItem = TopicContentSummary & {
  kind: 'slides'
  content: SlidesDocument
  summary: null
  file: null
  assets: TopicAsset[]
}

export type PresentationContentItem = TopicContentSummary & {
  kind: 'presentation'
  content: Record<string, never>
  summary: string
  file: TopicFile
  assets: []
}

export type TopicContentItem =
  | DocContentItem
  | SlidesContentItem
  | PresentationContentItem

export type TopicWorkspace = {
  topic: {
    id: string
    title: string
    courseId: string
  }
  slides: SlidesContentItem | null
  doc: DocContentItem | null
  upload: PresentationContentItem | null
}

export type SignedFileUrl = {
  url: string
  expiresAt: string
  fileName: string
  mimeType: string
  sizeBytes: number
  fileClass: FileClass
  width: number | null
  height: number | null
}

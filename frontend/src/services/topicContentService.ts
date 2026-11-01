import type {
  AssetUploadKind,
  ContentKind,
  PresentationUploadInput,
  SignedFileUrl,
  TopicAsset,
  TopicContentItem,
  TopicWorkspace,
  UpdateContentInput,
} from '../types/topicContent'
import { deleteAuth, get, patchAuth, putAuth } from './apiClient'
import { uploadMultipart } from './uploadRequest'
import type { UploadRequestOptions } from './uploadRequest'

export function getTopicWorkspace(
  topicId: string,
  accessToken: string,
): Promise<TopicWorkspace> {
  return get<TopicWorkspace>(
    `/api/topics/${topicId}/content`,
    accessToken,
  )
}

export function ensureContent(
  topicId: string,
  kind: ContentKind,
  accessToken: string,
): Promise<TopicContentItem> {
  return putAuth<TopicContentItem>(
    `/api/topics/${topicId}/content/${kind}`,
    {},
    accessToken,
  )
}

export function getContent(
  contentId: string,
  accessToken: string,
): Promise<TopicContentItem> {
  return get<TopicContentItem>(`/api/content/${contentId}`, accessToken)
}

export function updateContent(
  contentId: string,
  input: UpdateContentInput,
  accessToken: string,
): Promise<TopicContentItem> {
  return patchAuth<TopicContentItem>(
    `/api/content/${contentId}`,
    input,
    accessToken,
  )
}

export async function deleteContent(
  contentId: string,
  accessToken: string,
): Promise<void> {
  await deleteAuth<{ id: string }>(`/api/content/${contentId}`, accessToken)
}

export function getFileUrl(
  fileId: string,
  accessToken: string,
): Promise<SignedFileUrl> {
  return get<SignedFileUrl>(`/api/files/${fileId}/url`, accessToken)
}

export function uploadPresentation(
  topicId: string,
  input: PresentationUploadInput & { file: File },
  accessToken: string,
  options: UploadRequestOptions = {},
): Promise<TopicContentItem> {
  const formData = new FormData()
  formData.set('file', input.file)
  formData.set('title', input.title)
  formData.set('summary', input.summary)

  return uploadMultipart<TopicContentItem>(
    `/api/topics/${topicId}/presentations`,
    formData,
    accessToken,
    options,
  )
}

export function uploadContentAsset(
  contentId: string,
  input: { kind: AssetUploadKind; file: File },
  accessToken: string,
  options: UploadRequestOptions = {},
): Promise<TopicAsset> {
  const formData = new FormData()
  formData.set('file', input.file)
  formData.set('kind', input.kind)

  return uploadMultipart<TopicAsset>(
    `/api/content/${contentId}/assets`,
    formData,
    accessToken,
    options,
  )
}

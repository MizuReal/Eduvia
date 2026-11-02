import type { StudentTopicContent } from '../types/topicContent'
import { get } from './apiClient'

export function getStudentTopicContent(
  topicId: string,
  accessToken: string,
): Promise<StudentTopicContent> {
  return get<StudentTopicContent>(
    `/api/student/topics/${topicId}/content`,
    accessToken,
  )
}

import { createContext } from 'react'
import type { TopicAsset } from '../../types/topicContent'

export type TopicAssetContextValue = {
  getAsset: (fileId: string) => TopicAsset | undefined
  refreshAsset: (fileId: string) => Promise<TopicAsset | null>
}

export const TopicAssetContext =
  createContext<TopicAssetContextValue | null>(null)

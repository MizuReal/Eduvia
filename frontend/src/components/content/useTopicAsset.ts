import { useContext } from 'react'
import { TopicAssetContext } from './topicAssetContext'

export function useTopicAssets() {
  const context = useContext(TopicAssetContext)

  if (!context) {
    throw new Error('TopicAssetProvider is required for embedded content.')
  }

  return context
}

export function useTopicAsset(fileId: string) {
  const { getAsset, refreshAsset } = useTopicAssets()

  return {
    asset: getAsset(fileId),
    refreshAsset,
  }
}

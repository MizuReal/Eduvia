import { useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { TopicAsset } from '../../types/topicContent'
import {
  TopicAssetContext,
  type TopicAssetContextValue,
} from './topicAssetContext'

type TopicAssetProviderProps = {
  assets: TopicAsset[]
  refreshAsset: (fileId: string) => Promise<TopicAsset | null>
  children: ReactNode
}

export function TopicAssetProvider({
  assets,
  refreshAsset,
  children,
}: TopicAssetProviderProps) {
  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  )

  const getAsset = useCallback(
    (fileId: string) => assetsById.get(fileId),
    [assetsById],
  )

  const value = useMemo<TopicAssetContextValue>(
    () => ({ getAsset, refreshAsset }),
    [getAsset, refreshAsset],
  )

  return (
    <TopicAssetContext.Provider value={value}>
      {children}
    </TopicAssetContext.Provider>
  )
}

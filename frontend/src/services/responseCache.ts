const CACHE_TTL_MS = 30_000
const MAX_CACHE_ENTRIES = 50

type CacheEntry = {
  expiresAt: number
  value: unknown
}

const cache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<unknown>>()

function toKey(path: string, accessToken: string): string {
  return `${accessToken}\u0000${path}`
}

export function readCached<T>(
  path: string,
  accessToken: string,
): { hit: true; value: T } | { hit: false } {
  const key = toKey(path, accessToken)
  const entry = cache.get(key)

  if (!entry) {
    return { hit: false }
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return { hit: false }
  }

  return { hit: true, value: entry.value as T }
}

export function writeCached<T>(
  path: string,
  accessToken: string,
  value: T,
): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value

    if (oldestKey !== undefined) {
      cache.delete(oldestKey)
    }
  }

  cache.set(toKey(path, accessToken), {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  })
}

export function readInFlight<T>(
  path: string,
  accessToken: string,
): Promise<T> | null {
  const pending = inFlight.get(toKey(path, accessToken))

  return pending ? (pending as Promise<T>) : null
}

export function trackInFlight<T>(
  path: string,
  accessToken: string,
  request: Promise<T>,
): Promise<T> {
  const key = toKey(path, accessToken)

  inFlight.set(key, request)
  request.then(
    () => {
      inFlight.delete(key)
    },
    () => {
      inFlight.delete(key)
    },
  )

  return request
}

export function clearResponseCache(): void {
  cache.clear()
  inFlight.clear()
}

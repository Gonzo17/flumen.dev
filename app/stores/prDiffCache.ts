import type { PrDiffFile } from '~~/server/api/repository/[owner]/[repo]/pulls/[number]/diff.get'

interface CachedPrDiff {
  headSha: string
  diff: string
  files: Record<string, PrDiffFile>
  fetchedAt: number
}

const MAX_AGE_MS = 60 * 60 * 1000 // 1 hour
const MAX_ENTRIES = 20

export const usePrDiffCacheStore = defineStore('pr-diff-cache', () => {
  const cache = ref<Record<string, CachedPrDiff>>({})

  function cacheKey(owner: string, repo: string, number: number) {
    return `${owner}/${repo}#${number}`
  }

  function get(owner: string, repo: string, number: number, currentHeadSha?: string): CachedPrDiff | null {
    const key = cacheKey(owner, repo, number)
    const entry = cache.value[key]
    if (!entry) return null

    // Invalidate if headSha changed
    if (currentHeadSha && entry.headSha !== currentHeadSha) return null

    // Invalidate if older than 1 hour
    if (Date.now() - entry.fetchedAt > MAX_AGE_MS) return null

    return entry
  }

  function set(owner: string, repo: string, number: number, data: { headSha: string, diff: string, files: Record<string, PrDiffFile> }) {
    const key = cacheKey(owner, repo, number)

    // Evict oldest entries if at capacity
    const keys = Object.keys(cache.value)
    if (keys.length >= MAX_ENTRIES && !cache.value[key]) {
      const oldest = keys.reduce((a, b) =>
        cache.value[a]!.fetchedAt < cache.value[b]!.fetchedAt ? a : b,
      )
      const { [oldest]: _, ...rest } = cache.value
      cache.value = { ...rest, [key]: { ...data, fetchedAt: Date.now() } }
      return
    }

    cache.value = { ...cache.value, [key]: { ...data, fetchedAt: Date.now() } }
  }

  function invalidate(owner: string, repo: string, number: number) {
    const key = cacheKey(owner, repo, number)
    const { [key]: _, ...rest } = cache.value
    cache.value = rest
  }

  return { get, set, invalidate }
}, {
  persist: {
    pick: ['cache'],
  },
})

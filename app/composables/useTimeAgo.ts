function formatTimeAgo(timestamp: string | number, t: (key: string, params?: unknown) => string): string {
  const ms = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime()
  const seconds = Math.floor((Date.now() - ms) / 1000)

  if (seconds < 60) return t('time.justNow')

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('time.minutesAgo', { count: minutes })

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('time.hoursAgo', { count: hours })

  const days = Math.floor(hours / 24)
  if (days < 30) return t('time.daysAgo', { count: days })

  const months = Math.floor(days / 30)
  if (months < 12) return t('time.monthsAgo', { count: months })

  const years = Math.floor(months / 12)
  return t('time.yearsAgo', { count: years })
}

/** Reactive composable — for values that change over time (e.g. repo.pushedAt) */
export function useTimeAgo(date: Ref<string | number> | string | number) {
  const { t } = useI18n()
  return computed(() => {
    const timestamp = typeof date === 'string' || typeof date === 'number' ? date : date.value
    return formatTimeAgo(timestamp, t)
  })
}

/** Simple function — for static values in lists (ISO string or epoch ms) */
export function timeAgo(date: string | number): string {
  const { t } = useI18n()
  return formatTimeAgo(date, t)
}

export interface ActivityBucket {
  count: number
  /** 0–100 relative height for bar visualization */
  height: number
}

/**
 * Groups timestamps into fixed-width buckets for activity visualizations.
 * Returns oldest-first (left = past, right = present).
 */
export function useActivityBuckets(
  dates: Ref<Array<string | number>> | ComputedRef<Array<string | number>>,
  options: { buckets?: number, bucketMs?: number } = {},
) {
  const bucketCount = options.buckets ?? 4
  const bucketMs = options.bucketMs ?? 7 * 24 * 60 * 60 * 1000 // 1 week

  const buckets = computed<ActivityBucket[]>(() => {
    const now = Date.now()
    const counts = Array.from<number>({ length: bucketCount }).fill(0)

    for (const date of dates.value) {
      const ms = typeof date === 'number' ? date : new Date(date).getTime()
      const index = Math.floor((now - ms) / bucketMs)
      if (index >= 0 && index < bucketCount) {
        counts[index]!++
      }
    }

    // Reverse: oldest first (left to right = past to present)
    counts.reverse()
    const max = Math.max(...counts, 1)
    return counts.map(count => ({ count, height: Math.round((count / max) * 100) }))
  })

  const lastActivity = computed(() => {
    const all = dates.value
    if (!all.length) return null
    let latest = 0
    for (const date of all) {
      const ms = typeof date === 'number' ? date : new Date(date).getTime()
      if (ms > latest) latest = ms
    }
    return latest
  })

  const lastActivityAgo = useTimeAgo(computed(() => lastActivity.value ?? Date.now()))

  return { buckets, lastActivity, lastActivityAgo }
}

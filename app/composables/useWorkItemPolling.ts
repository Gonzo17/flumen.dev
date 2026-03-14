import type { WorkItemDetail } from '~~/shared/types/work-item'

const POLL_INTERVAL = 20_000
const MAX_STALE_ROUNDS = 3

export function useWorkItemPolling(
  workItem: Ref<WorkItemDetail | null | undefined>,
  fetchUrl: Ref<string>,
) {
  const requestFetch = useRequestFetch()

  let timer: ReturnType<typeof setInterval> | null = null
  let staleCount = 0
  let lastFingerprint = ''

  const polling = ref(false)

  const needsPolling = computed(() => {
    const wi = workItem.value
    if (!wi) return false
    return wi.ciStatus === 'PENDING'
  })

  function fingerprint(): string {
    const wi = workItem.value
    if (!wi) return ''
    return `${wi.state}|${wi.ciStatus}|${wi.updatedAt}`
  }

  async function tick() {
    try {
      const fresh = await requestFetch<WorkItemDetail>(fetchUrl.value)
      if (!fresh || !workItem.value) return
      Object.assign(workItem.value, fresh)
    }
    catch {
      return
    }

    const current = fingerprint()
    if (current === lastFingerprint) {
      staleCount++
    }
    else {
      staleCount = 0
      lastFingerprint = current
    }

    if (staleCount >= MAX_STALE_ROUNDS || !needsPolling.value) {
      stop()
    }
  }

  function start() {
    if (timer) return
    staleCount = 0
    lastFingerprint = fingerprint()
    polling.value = true
    timer = setInterval(tick, POLL_INTERVAL)
  }

  function stop() {
    if (!timer) return
    clearInterval(timer)
    timer = null
    polling.value = false
  }

  watch(needsPolling, (should) => {
    if (import.meta.client && should) {
      start()
    }
    else {
      stop()
    }
  }, { immediate: true })

  async function trigger() {
    if (import.meta.client) {
      start()
      await tick()
    }
  }

  onScopeDispose(stop)

  return {
    polling: readonly(polling),
    trigger,
  }
}

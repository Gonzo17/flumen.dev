<script setup lang="ts">
const { t } = useI18n()
const store = useFocusStore()

interface Pill {
  label: string
  color: 'neutral' | 'error' | 'warning'
}

const pills = computed<Pill[]>(() => {
  const prs = store.visiblePRs
  const issues = store.visibleIssues
  if (prs.length + issues.length === 0) return []

  let oldestDays = 0
  let failingCI = 0
  let pendingCI = 0
  let changesRequested = 0
  let conflicts = 0

  for (const pr of prs) {
    const days = Math.floor((Date.now() - new Date(pr.updatedAt).getTime()) / 86_400_000)
    if (days > oldestDays) oldestDays = days
    if (pr.ciStatus === 'FAILURE') failingCI++
    if (pr.ciStatus === 'PENDING') pendingCI++
    if (pr.reviewDecision === 'CHANGES_REQUESTED') changesRequested++
    if (pr.mergeable === 'CONFLICTING') conflicts++
  }

  const result: Pill[] = []
  if (prs.length > 0)
    result.push({ label: t('focus.inbox.summary.prs', { count: prs.length }), color: 'neutral' })
  if (oldestDays > 0)
    result.push({ label: t('focus.inbox.summary.oldest', { days: oldestDays }), color: 'neutral' })
  if (failingCI > 0)
    result.push({ label: t('focus.inbox.summary.ciFailing', { count: failingCI }), color: 'error' })
  if (pendingCI > 0)
    result.push({ label: t('focus.inbox.summary.ciPending', { count: pendingCI }), color: 'warning' })
  if (changesRequested > 0)
    result.push({ label: t('focus.inbox.summary.changesRequested', { count: changesRequested }), color: 'warning' })
  if (conflicts > 0)
    result.push({ label: t('focus.inbox.summary.conflicts', { count: conflicts }), color: 'error' })
  if (issues.length > 0)
    result.push({ label: t('focus.inbox.summary.issues', { count: issues.length }), color: 'neutral' })
  return result
})
</script>

<template>
  <div
    v-if="pills.length"
    class="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-default"
  >
    <UBadge
      v-for="(pill, i) in pills"
      :key="i"
      :label="pill.label"
      :color="pill.color"
      variant="subtle"
      size="sm"
    />
  </div>
</template>

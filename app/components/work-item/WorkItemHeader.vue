<script lang="ts" setup>
import type { CheckRunDetail } from '~~/shared/types/check-run'
import type { IssueDetail } from '~~/shared/types/issue-detail'
import type { WorkItemDetail } from '~~/shared/types/work-item'
import { formatDuration, getCIIcon, getIssueStateColor, getIssueStateIcon, getPRStateColor, getPRStateIcon } from '~/utils/prMeta'

const props = defineProps<{
  workItem: WorkItemDetail
  repo: string
  issue?: IssueDetail | null
}>()

const { t } = useI18n()
const toast = useToast()
const { open: openProfile } = useUserProfileDialog()

const createdAgo = useTimeAgo(computed(() => props.workItem.createdAt))
const updatedAgo = useTimeAgo(computed(() => props.workItem.updatedAt))

// --- PR numbers for CI checks ---

const prNumbers = computed<number[]>(() => {
  const wi = props.workItem
  if (wi.primaryType === 'pull') {
    return [wi.number]
  }
  return wi.linkedPulls
    .filter(p => !p.state || p.state === 'OPEN')
    .map(p => p.number)
})

const [ownerRef, repoRef] = (() => {
  const parts = props.repo.split('/')
  return [
    computed(() => parts[0] ?? ''),
    computed(() => parts[1] ?? ''),
  ]
})()

const emit = defineEmits<{
  ciStatusChanged: []
  merged: []
}>()

const { result: checkResult, statusChanged } = useCheckRuns(ownerRef, repoRef, prNumbers)
const ciExpanded = ref(false)

watch(statusChanged, () => {
  emit('ciStatusChanged')
})

// --- Row 1: State ---

const stateIcon = computed(() => {
  const wi = props.workItem
  if (wi.primaryType === 'pull') return getPRStateIcon(wi.state, wi.isDraft)
  return getIssueStateIcon(wi.state)
})

const stateColor = computed(() => {
  const wi = props.workItem
  if (wi.primaryType === 'pull') return getPRStateColor(wi.state, wi.isDraft)
  return getIssueStateColor(wi.state)
})

const stateBg = computed(() => stateColor.value.replace('text-', 'bg-') + '/10')

const stateLabel = computed(() => {
  const wi = props.workItem
  if (wi.primaryType === 'pull') {
    if (wi.state === 'MERGED') return t('repos.workItem.state.merged')
    if (wi.state === 'CLOSED') return t('repos.workItem.state.closed')
    if (wi.state === 'DRAFT') return t('repos.workItem.state.draft')
    return t('repos.workItem.state.open')
  }
  if (wi.state === 'OPEN') return t('issues.open')
  return t('issues.closedAs')
})

function copyLink() {
  navigator.clipboard.writeText(props.workItem.url)
  toast.add({ title: t('common.copied'), color: 'success' })
}

// --- Row 2: Assignees + PRs ---

const linkedPrs = computed(() =>
  props.workItem.linkedPulls.map(p => ({
    number: p.number,
    title: p.title,
    url: p.htmlUrl,
    state: p.state ?? '',
    isDraft: p.isDraft ?? false,
  })),
)

// --- Row 4: CI ---

const failedChecks = computed(() => checkResult.value?.checks.filter(c => c.status === 'FAILURE') ?? [])
const pendingChecks = computed(() => checkResult.value?.checks.filter(c => c.status === 'PENDING') ?? [])
const passedChecks = computed(() => checkResult.value?.checks.filter(c => c.status === 'SUCCESS') ?? [])

const failedExpanded = ref(true)
const passedExpanded = ref(false)

// --- Log dialog ---
const logDialogOpen = ref(false)
const logDialogCheck = ref<CheckRunDetail | null>(null)

function openLogDialog(check: CheckRunDetail) {
  logDialogCheck.value = check
  logDialogOpen.value = true
}

const ciMeta = computed(() => getCIIcon(checkResult.value?.rollupStatus) ?? { name: 'i-lucide-circle-dashed', color: 'text-muted' })

const ciSummary = computed(() => {
  if (!checkResult.value) return ''
  const r = checkResult.value
  if (r.rollupStatus === 'SUCCESS' && r.total > 0) return t('workItems.ci.allPassed')
  const parts: string[] = []
  if (r.failed > 0) parts.push(t('workItems.ci.failedCount', { count: r.failed }))
  if (r.pending > 0) parts.push(t('workItems.ci.pending', { count: r.pending }))
  if (r.passed > 0) parts.push(t('workItems.ci.passedCount', { count: r.passed }))
  return parts.join(' \u00b7 ')
})

// --- Row 5: Merge ---

const mergeExpanded = ref(false)
const mergeStrategy = ref<'merge' | 'squash' | 'rebase'>('squash')
const mergeTitle = ref('')
const mergeMessage = ref('')
const merging = ref(false)
const justMerged = ref(false)

const isPR = computed(() => props.workItem.primaryType === 'pull')
const isPROpen = computed(() => isPR.value && props.workItem.state === 'OPEN' && !justMerged.value)
const mergeNumber = computed(() => isPROpen.value ? props.workItem.number : null)
const { status: mergeStatus, loading: mergeLoading, error: mergeError, fetch: fetchMergeStatus, merge: executeMerge } = useMergeStatus(ownerRef, repoRef, mergeNumber)

// Lazy fetch: only when expanded for the first time
watch(mergeExpanded, (expanded) => {
  if (expanded && !mergeStatus.value && !mergeLoading.value) {
    fetchMergeStatus()
  }
})

// Sync defaults from API when loaded
watch(mergeStatus, (ms) => {
  if (!ms) return
  mergeStrategy.value = ms.defaultStrategy
  if (!mergeTitle.value) mergeTitle.value = ms.defaultTitle
})

const STRATEGY_VISUALS = {
  merge: ['i-lucide-circle', 'i-lucide-circle', 'i-lucide-circle', 'i-lucide-git-merge', 'i-lucide-arrow-right'],
  squash: ['i-lucide-circle', 'i-lucide-circle', 'i-lucide-circle', 'i-lucide-chevrons-right', 'i-lucide-git-commit-horizontal'],
  rebase: ['i-lucide-arrow-right', 'i-lucide-circle', 'i-lucide-circle', 'i-lucide-circle', 'i-lucide-arrow-right'],
} as const

const KNOWN_STRATEGIES = new Set<string>(['merge', 'squash', 'rebase'])

const mergeStrategies = computed(() => {
  const allowed = (mergeStatus.value?.allowedStrategies ?? ['merge', 'squash', 'rebase']).filter(v => KNOWN_STRATEGIES.has(v))
  const count = mergeStatus.value?.commitCount ?? 0
  return allowed.map((value) => {
    const base = { value, visual: STRATEGY_VISUALS[value] }
    switch (value) {
      case 'merge': return { ...base, label: t('workItems.merge.keepAll'), desc: t('workItems.merge.keepAllDesc', { count }), techName: 'merge commit', icon: 'i-lucide-git-merge' }
      case 'squash': return { ...base, label: t('workItems.merge.combineIntoOne'), desc: t('workItems.merge.combineIntoOneDesc', { count }), techName: 'squash', icon: 'i-lucide-git-commit-horizontal' }
      case 'rebase': return { ...base, label: t('workItems.merge.replayOnTop'), desc: t('workItems.merge.replayOnTopDesc', { count }), techName: 'rebase', icon: 'i-lucide-git-branch' }
      default: return { ...base, label: value, desc: '', techName: value, icon: 'i-lucide-git-merge' }
    }
  })
})

const activeStrategy = computed(() => mergeStrategies.value.find(s => s.value === mergeStrategy.value) ?? mergeStrategies.value[0])
const showCommitFields = computed(() => mergeStrategy.value !== 'rebase')
const canMerge = computed(() => mergeStatus.value?.canMerge === true)

async function handleMerge() {
  if (!canMerge.value || merging.value) return
  merging.value = true
  try {
    await executeMerge(
      mergeStrategy.value,
      mergeStrategy.value !== 'rebase' ? mergeTitle.value : undefined,
      mergeStrategy.value !== 'rebase' ? mergeMessage.value : undefined,
      mergeStatus.value?.headSha,
    )
    justMerged.value = true
    toast.add({ title: t('workItems.merge.mergeSuccess'), color: 'success' })
    emit('merged')
  }
  catch (e: unknown) {
    const fetchErr = e as { data?: { data?: { errorKey?: string } } }
    const errorKey = fetchErr.data?.data?.errorKey ?? 'unknown'
    toast.add({
      title: t('workItems.merge.mergeFailed'),
      description: t(`workItems.merge.error.${errorKey}`),
      color: 'error',
    })
  }
  finally {
    merging.value = false
  }
}
</script>

<template>
  <div class="sticky top-0 z-10 border border-default rounded-xl sm:rounded-2xl bg-elevated/95 shadow-sm backdrop-blur">
    <!-- Row 1: State + Title + Actions -->
    <div class="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3">
      <UTooltip :text="stateLabel">
        <span
          class="inline-flex items-center justify-center size-7 rounded-full shrink-0"
          :class="stateBg"
        >
          <UIcon
            :name="stateIcon"
            class="size-4"
            :class="stateColor"
          />
        </span>
      </UTooltip>

      <h1 class="flex-1 min-w-0 text-base sm:text-lg font-semibold text-highlighted truncate">
        {{ workItem.title }}
      </h1>

      <span class="font-mono text-muted text-xs sm:text-sm shrink-0">#{{ workItem.number }}</span>

      <div class="flex items-center gap-0.5 shrink-0">
        <UTooltip :text="t('common.copyLink')">
          <UButton
            icon="i-lucide-link"
            variant="ghost"
            color="neutral"
            size="xs"
            :aria-label="t('common.copyLink')"
            @click="copyLink"
          />
        </UTooltip>
        <UTooltip :text="t('common.viewOnGithub')">
          <UButton
            icon="i-lucide-external-link"
            variant="ghost"
            color="neutral"
            size="xs"
            :aria-label="t('common.viewOnGithub')"
            :to="workItem.url"
            target="_blank"
          />
        </UTooltip>
      </div>
    </div>

    <!-- Row 2: Assignment Zone -->
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:gap-x-3 px-3 sm:px-4 py-2 border-t border-accented">
      <!-- Left: Assignees + PRs -->
      <div class="flex flex-wrap items-center gap-2 flex-1 min-w-0">
        <!-- No assignees -->
        <UBadge
          v-if="workItem.assignees.length === 0"
          :label="t('issues.detail.needsOwner')"
          color="warning"
          variant="subtle"
          icon="i-lucide-user-x"
        />

        <!-- Assignees -->
        <div
          v-for="assignee in workItem.assignees"
          :key="assignee.login"
          class="flex items-center gap-1.5"
        >
          <button
            type="button"
            class="inline-flex items-center gap-1.5 cursor-pointer hover:underline"
            @click="openProfile(assignee.login)"
          >
            <UAvatar
              :src="assignee.avatarUrl"
              :alt="assignee.login"
              size="2xs"
            />
            <span class="text-sm font-medium text-highlighted hidden sm:inline">{{ assignee.login }}</span>
          </button>
        </div>

        <!-- Linked PRs -->
        <UTooltip
          v-for="pr in linkedPrs"
          :key="pr.number"
          :text="`#${pr.number} ${pr.title}`"
        >
          <a
            :href="pr.url"
            target="_blank"
            class="inline-flex items-center gap-1 rounded-full border border-default bg-elevated/50 px-2 py-0.5 text-xs hover:border-primary/50 transition-colors"
          >
            <UIcon
              :name="getPRStateIcon(pr.state, pr.isDraft)"
              class="size-3.5"
              :class="getPRStateColor(pr.state, pr.isDraft)"
            />
            <span class="text-muted">#{{ pr.number }}</span>
          </a>
        </UTooltip>
      </div>

      <!-- Right: Claims (only when issue detail is available) -->
      <IssueClaimFlow
        v-if="issue"
        :issue="issue"
        :repo="repo"
      />
    </div>

    <!-- Row 3: Labels, Milestone, Timestamps -->
    <div class="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 border-t border-accented text-xs flex-wrap">
      <!-- Labels -->
      <UBadge
        v-for="label in workItem.labels"
        :key="label.name"
        variant="subtle"
        size="xs"
        :style="{ backgroundColor: `#${label.color}20`, color: `#${label.color}` }"
      >
        {{ label.name }}
      </UBadge>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- Timestamps + comment count -->
      <span class="text-muted">{{ createdAgo }}</span>
      <span class="text-muted/60 hidden sm:inline">&middot;</span>
      <span class="text-muted hidden sm:inline">{{ updatedAgo }}</span>
      <span
        v-if="workItem.commentCount > 0"
        class="inline-flex items-center gap-1 text-muted"
      >
        <UIcon
          name="i-lucide-message-square"
          class="size-3.5"
        />
        {{ workItem.commentCount }}
      </span>
    </div>

    <!-- Row 4: CI Checks -->
    <div
      v-if="prNumbers.length > 0"
      class="border-t border-accented"
    >
      <!-- Summary bar (always visible) -->
      <button
        type="button"
        class="flex items-center gap-2 w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs hover:bg-elevated/50 transition-colors"
        :aria-label="t('workItems.ci.checks')"
        :aria-expanded="ciExpanded"
        @click="ciExpanded = !ciExpanded"
      >
        <UIcon
          :name="ciMeta.name"
          class="size-3.5 shrink-0"
          :class="[ciMeta.color, ciMeta.spin ? 'animate-spin' : '']"
        />
        <span class="text-muted truncate">{{ ciSummary }}</span>
        <UIcon
          :name="ciExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-3.5 text-muted shrink-0 ml-auto"
        />
      </button>

      <!-- Expanded: categorized, scrollable -->
      <div
        v-if="ciExpanded && checkResult"
        class="max-h-48 overflow-y-auto px-3 sm:px-4 pb-2 space-y-2"
      >
        <!-- Failed -->
        <div v-if="failedChecks.length">
          <button
            type="button"
            class="flex items-center gap-2 w-full text-[11px] font-medium text-red-500 uppercase tracking-wide mb-1 hover:text-red-400 transition-colors cursor-pointer"
            @click="failedExpanded = !failedExpanded"
          >
            <UIcon
              :name="failedExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
              class="size-3 shrink-0"
            />
            {{ t('workItems.ci.failedCount', { count: failedChecks.length }) }}
          </button>
          <template v-if="failedExpanded">
            <div
              v-for="check in failedChecks"
              :key="check.name"
              class="flex items-center gap-2 text-xs py-0.5"
            >
              <UIcon
                :name="getCIIcon('FAILURE')!.name"
                class="size-3.5 shrink-0"
                :class="getCIIcon('FAILURE')!.color"
              />
              <button
                class="truncate flex-1 text-highlighted text-left hover:underline cursor-pointer"
                @click="openLogDialog(check)"
              >
                {{ check.name }}
              </button>
              <span
                v-if="check.durationSeconds !== null"
                class="text-muted shrink-0"
              >{{ formatDuration(check.durationSeconds) }}</span>
              <button
                v-if="check.jobId"
                class="text-primary hover:underline shrink-0 cursor-pointer"
                @click="openLogDialog(check)"
              >
                {{ t('workItems.ci.viewLog') }}
              </button>
              <a
                v-else-if="check.detailsUrl"
                :href="check.detailsUrl"
                target="_blank"
                class="text-primary hover:underline shrink-0"
              >{{ t('workItems.ci.viewLog') }}</a>
            </div>
          </template>
        </div>

        <!-- Running -->
        <div v-if="pendingChecks.length">
          <p class="text-[11px] font-medium text-amber-500 uppercase tracking-wide mb-1">
            {{ t('workItems.ci.pending', { count: pendingChecks.length }) }}
          </p>
          <div
            v-for="check in pendingChecks"
            :key="check.name"
            class="flex items-center gap-2 text-xs py-0.5"
          >
            <UIcon
              :name="getCIIcon('PENDING')!.name"
              class="size-3.5 shrink-0 animate-spin"
              :class="getCIIcon('PENDING')!.color"
            />
            <span class="truncate flex-1 text-highlighted">{{ check.name }}</span>
          </div>
        </div>

        <!-- Passed (collapsed by default) -->
        <div v-if="passedChecks.length">
          <button
            type="button"
            class="flex items-center gap-2 w-full text-[11px] font-medium text-emerald-500 uppercase tracking-wide mb-1 hover:text-emerald-400 transition-colors cursor-pointer"
            @click="passedExpanded = !passedExpanded"
          >
            <UIcon
              :name="passedExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
              class="size-3 shrink-0"
            />
            {{ t('workItems.ci.passedCount', { count: passedChecks.length }) }}
          </button>
          <template v-if="passedExpanded">
            <div
              v-for="check in passedChecks"
              :key="check.name"
              class="flex items-center gap-2 text-xs py-0.5"
            >
              <UIcon
                :name="getCIIcon('SUCCESS')!.name"
                class="size-3.5 shrink-0"
                :class="getCIIcon('SUCCESS')!.color"
              />
              <button
                class="truncate flex-1 text-muted text-left hover:underline cursor-pointer"
                @click="openLogDialog(check)"
              >
                {{ check.name }}
              </button>
              <span
                v-if="check.durationSeconds !== null"
                class="text-muted shrink-0"
              >{{ formatDuration(check.durationSeconds) }}</span>
              <button
                v-if="check.jobId"
                class="text-primary hover:underline shrink-0 cursor-pointer"
                @click="openLogDialog(check)"
              >
                {{ t('workItems.ci.viewLog') }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Row 5: Merge (PR only) -->
    <div
      v-if="isPR"
      class="border-t border-accented"
    >
      <!-- Already merged (locally or after refresh) -->
      <div
        v-if="justMerged || workItem.state === 'MERGED'"
        class="flex items-center gap-2 px-3 sm:px-4 py-2.5"
      >
        <UIcon
          name="i-lucide-git-merge"
          class="size-3.5 shrink-0 text-violet-500"
        />
        <span class="text-xs text-violet-500 font-medium">{{ t('workItems.merge.mergeSuccess') }}</span>
      </div>

      <!-- Open PR: merge controls -->
      <template v-else-if="isPROpen">
        <!-- Collapsed: summary + merge button -->
        <div class="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5">
          <button
            type="button"
            class="flex items-center gap-2 flex-1 min-w-0 text-xs hover:bg-elevated/50 rounded-md px-1 -mx-1 py-0.5 transition-colors"
            :aria-expanded="mergeExpanded"
            :aria-label="t('workItems.merge.merge')"
            @click="mergeExpanded = !mergeExpanded"
          >
            <UIcon
              name="i-lucide-git-merge"
              class="size-3.5 shrink-0"
              :class="canMerge ? 'text-emerald-500' : 'text-muted'"
            />
            <span class="text-muted truncate">
              {{ mergeLoading ? t('common.loading') : t('workItems.merge.readyToMerge') }}
            </span>
            <UIcon
              :name="mergeExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="size-3.5 text-muted shrink-0"
            />
          </button>

          <UButton
            :label="t('workItems.merge.merge')"
            icon="i-lucide-git-merge"
            size="xs"
            color="primary"
            :disabled="!canMerge || merging"
            :loading="merging"
            class="shrink-0"
            @click="mergeExpanded = true"
          />
        </div>

        <!-- Expanded: strategy picker + commit message -->
        <div
          v-if="mergeExpanded"
          class="px-3 sm:px-4 pb-3 space-y-3"
        >
          <!-- Loading state -->
          <div
            v-if="mergeLoading"
            class="flex items-center justify-center py-4 text-muted text-xs"
          >
            <UIcon
              name="i-lucide-loader-2"
              class="size-4 animate-spin mr-2"
            />
            {{ t('common.loading') }}
          </div>

          <!-- Error state -->
          <div
            v-else-if="mergeError"
            class="flex items-center gap-2 py-3 text-xs text-red-500"
          >
            <UIcon
              name="i-lucide-alert-circle"
              class="size-4 shrink-0"
            />
            <span>{{ mergeError }}</span>
            <button
              class="text-primary hover:underline ml-auto cursor-pointer"
              @click="fetchMergeStatus"
            >
              {{ t('common.retry') }}
            </button>
          </div>

          <template v-else-if="mergeStatus">
            <!-- Strategy cards -->
            <div
              class="grid gap-1.5"
              :class="mergeStrategies.length === 1 ? 'grid-cols-1' : mergeStrategies.length === 2 ? 'grid-cols-2' : 'grid-cols-3'"
            >
              <button
                v-for="strategy in mergeStrategies"
                :key="strategy.value"
                type="button"
                class="group relative flex flex-col items-center gap-1 rounded-lg border px-2 py-2 transition-all duration-200"
                :class="[
                  mergeStrategy === strategy.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-default hover:border-primary/40 hover:bg-elevated/50',
                  merging ? 'pointer-events-none opacity-50' : 'cursor-pointer',
                ]"
                :disabled="merging"
                @click="mergeStrategy = strategy.value"
              >
                <!-- Visual: mini git graph -->
                <div class="flex items-center gap-0.5 h-4">
                  <template
                    v-for="(icon, i) in strategy.visual"
                    :key="i"
                  >
                    <UIcon
                      :name="icon"
                      class="size-2.5 transition-colors duration-200"
                      :class="mergeStrategy === strategy.value ? 'text-primary' : 'text-muted/50 group-hover:text-muted'"
                    />
                  </template>
                </div>

                <!-- Label -->
                <span
                  class="text-[11px] font-medium text-center leading-tight transition-colors duration-200"
                  :class="mergeStrategy === strategy.value ? 'text-primary' : 'text-highlighted'"
                >
                  {{ strategy.label }}
                </span>

                <!-- Tech name -->
                <span class="text-[9px] text-muted/50 uppercase tracking-wider">
                  {{ strategy.techName }}
                </span>
              </button>
            </div>

            <!-- Description of selected strategy -->
            <p
              v-if="activeStrategy"
              class="text-xs text-muted leading-relaxed px-0.5"
            >
              {{ activeStrategy.desc }}
            </p>

            <!-- Commit fields (not for rebase) -->
            <template v-if="showCommitFields">
              <div
                class="space-y-2 rounded-lg border border-default bg-default/50 p-3 transition-opacity"
                :class="merging ? 'opacity-50 pointer-events-none' : ''"
              >
                <UInput
                  v-model="mergeTitle"
                  :placeholder="t('workItems.merge.commitTitle')"
                  size="sm"
                  variant="none"
                  :disabled="merging"
                  class="font-mono text-sm"
                />
                <div class="border-t border-accented" />
                <UTextarea
                  v-model="mergeMessage"
                  :placeholder="t('workItems.merge.commitMessage')"
                  size="sm"
                  variant="none"
                  :rows="2"
                  :disabled="merging"
                  autoresize
                  class="font-mono text-xs"
                />
              </div>
            </template>

            <!-- Merge button -->
            <UButton
              :label="t('workItems.merge.confirmMerge')"
              icon="i-lucide-git-merge"
              color="primary"
              block
              :disabled="!canMerge || merging"
              :loading="merging"
              size="md"
              @click="handleMerge"
            />
          </template>
        </div>
      </template>
    </div>

    <!-- CI Log Dialog -->
    <WorkItemCiLogDialog
      v-model:open="logDialogOpen"
      :check="logDialogCheck"
      :owner="ownerRef"
      :repo="repoRef"
    />
  </div>
</template>

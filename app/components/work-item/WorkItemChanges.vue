<script lang="ts" setup>
import type { PrDiffResult } from '~~/server/api/repository/[owner]/[repo]/pulls/[number]/diff.get'

const props = defineProps<{
  owner: string
  repo: string
  pullNumber: number
  headSha?: string
}>()

const { t } = useI18n()
const diffCacheStore = usePrDiffCacheStore()

const diffMode = ref<'split' | 'unified'>('split')
const wrap = ref(true)
const loading = ref(false)
const error = ref('')

const diffData = ref<PrDiffResult | null>(null)

interface FileDiff {
  oldFileName: string
  newFileName: string
  hunks: string[]
  oldContent?: string
  newContent?: string
}

const fileDiffs = computed<FileDiff[]>(() => {
  if (!diffData.value?.diff) return []

  const files: FileDiff[] = []
  const sections = diffData.value.diff.split(/^(?=diff --git )/m)

  for (const section of sections) {
    if (!section.trim()) continue

    const headerMatch = section.match(/^diff --git a\/(.+?) b\/(.+)/)
    if (!headerMatch?.[1] || !headerMatch[2]) continue

    const oldName = headerMatch[1]
    const newName = headerMatch[2]
    const contents = diffData.value.files[newName]
    files.push({
      oldFileName: oldName,
      newFileName: newName,
      hunks: [section],
      oldContent: contents?.oldContent ?? undefined,
      newContent: contents?.newContent ?? undefined,
    })
  }

  return files
})

async function loadDiff() {
  const { owner, repo, pullNumber, headSha } = props

  const cached = diffCacheStore.get(owner, repo, pullNumber, headSha)
  if (cached) {
    diffData.value = cached
    return
  }

  loading.value = true
  error.value = ''

  try {
    const result = await $fetch<PrDiffResult>(
      `/api/repository/${owner}/${repo}/pulls/${pullNumber}/diff`,
    )
    diffData.value = result
    diffCacheStore.set(owner, repo, pullNumber, result)
  }
  catch (err: unknown) {
    error.value = (err as Error).message || t('common.error')
  }
  finally {
    loading.value = false
  }
}

onMounted(() => loadDiff())

watch(
  () => [props.owner, props.repo, props.pullNumber, props.headSha] as const,
  ([, , , newSha], [prevOwner, prevRepo, prevNumber, oldSha]) => {
    const identityChanged = props.owner !== prevOwner || props.repo !== prevRepo || props.pullNumber !== prevNumber
    const shaChanged = newSha && oldSha && newSha !== oldSha
    if (identityChanged || shaChanged) {
      loadDiff()
    }
  },
)
</script>

<template>
  <div class="space-y-4">
    <!-- Controls -->
    <div class="flex items-center gap-1">
      <UBadge
        variant="subtle"
        size="sm"
      >
        {{ t('repos.diff.fileCount', fileDiffs.length) }}
      </UBadge>

      <div class="ml-auto flex items-center gap-1">
        <UButton
          :variant="diffMode === 'split' ? 'solid' : 'outline'"
          size="xs"
          @click="diffMode = 'split'"
        >
          {{ t('repos.diff.split') }}
        </UButton>
        <UButton
          :variant="diffMode === 'unified' ? 'solid' : 'outline'"
          size="xs"
          @click="diffMode = 'unified'"
        >
          {{ t('repos.diff.unified') }}
        </UButton>

        <UButton
          :icon="wrap ? 'i-lucide-wrap-text' : 'i-lucide-move-horizontal'"
          :aria-label="wrap ? t('repos.diff.nowrap') : t('repos.diff.wrap')"
          size="xs"
          variant="outline"
          class="ml-2"
          @click="wrap = !wrap"
        />
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="space-y-4"
    >
      <USkeleton class="h-48 w-full" />
      <USkeleton class="h-32 w-full" />
    </div>

    <!-- Error -->
    <UAlert
      v-else-if="error"
      color="error"
      :title="t('common.error')"
      :description="error"
    />

    <!-- Diff files -->
    <template v-else-if="fileDiffs.length">
      <UCard
        v-for="file in fileDiffs"
        :key="file.newFileName"
        class="overflow-hidden"
      >
        <template #header>
          <div class="flex items-center gap-2 text-sm font-mono">
            <UIcon
              name="i-lucide-file-diff"
              class="size-4 text-muted"
            />
            <span>{{ file.newFileName }}</span>
          </div>
        </template>

        <DiffFileView
          :hunks="file.hunks"
          :old-file-name="file.oldFileName"
          :new-file-name="file.newFileName"
          :old-content="file.oldContent"
          :new-content="file.newContent"
          :mode="diffMode"
          :wrap="wrap"
        />
      </UCard>
    </template>

    <!-- Empty -->
    <div
      v-else
      class="text-center py-16 text-muted"
    >
      <UIcon
        name="i-lucide-file-check"
        class="size-12 mb-3 opacity-30"
      />
      <p class="text-sm">
        {{ t('repos.diff.empty') }}
      </p>
    </div>
  </div>
</template>

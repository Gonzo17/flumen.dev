<script setup lang="ts">
import { LANGUAGE_COLORS } from '~~/shared/utils/language-colors'

const props = defineProps<{
  languages: Record<string, number>
}>()

const entries = computed(() => {
  const total = Object.values(props.languages).reduce((sum, v) => sum + v, 0)
  if (total === 0) return []
  return Object.entries(props.languages)
    .sort(([, a], [, b]) => b - a)
    .map(([lang, bytes]) => ({
      lang,
      percent: (bytes / total) * 100,
      color: LANGUAGE_COLORS[lang] ?? '#8b8b8b',
    }))
})
</script>

<template>
  <div
    v-if="entries.length"
    class="space-y-2"
  >
    <!-- Bar -->
    <div class="flex h-2 rounded-full overflow-hidden">
      <div
        v-for="entry in entries"
        :key="entry.lang"
        :style="{ width: `${entry.percent}%`, backgroundColor: entry.color }"
        class="transition-all duration-300"
      />
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap gap-x-3 gap-y-1">
      <div
        v-for="entry in entries"
        :key="entry.lang"
        class="flex items-center gap-1.5 text-xs"
      >
        <span
          class="size-2.5 rounded-full shrink-0"
          :style="{ backgroundColor: entry.color }"
        />
        <span class="text-highlighted">{{ entry.lang }}</span>
        <span class="text-dimmed">{{ entry.percent.toFixed(1) }}%</span>
      </div>
    </div>
  </div>
</template>

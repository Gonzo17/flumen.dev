<script lang="ts" setup>
import { DiffFileView as MutatioView } from '@flumen-dev/mutatio-view'
import '@flumen-dev/mutatio-view/style.css'

const props = defineProps<{
  hunks: string[]
  oldFileName?: string
  newFileName?: string
  oldContent?: string
  newContent?: string
  mode: 'split' | 'unified'
  highlight?: boolean
  wrap?: boolean
  selectedLines?: number[]
}>()

const emit = defineEmits<{
  selectionChange: [lines: number[]]
}>()

const colorMode = useColorMode()
const { t } = useI18n()

const theme = computed(() => colorMode.value === 'dark' ? 'dark' : 'light' as const)
</script>

<template>
  <MutatioView
    :hunks="props.hunks"
    :old-file-name="props.oldFileName"
    :new-file-name="props.newFileName"
    :old-content="props.oldContent"
    :new-content="props.newContent"
    :mode="props.mode"
    :highlight="props.highlight"
    :wrap="props.wrap"
    :theme="theme"
    :selected-lines="props.selectedLines"
    :label-expand-up="t('repos.diff.expandUp')"
    :label-expand-down="t('repos.diff.expandDown')"
    :label-expand-all="t('repos.diff.expandAll')"
    @selection-change="(lines: number[]) => emit('selectionChange', lines)"
  />
</template>

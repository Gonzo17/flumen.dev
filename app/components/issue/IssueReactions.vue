<script lang="ts" setup>
const props = defineProps<{
  reactions: ReactionGroup[]
  subjectId: string
  repo: string
  issueNumber: number
  pullCommentId?: number
  workItemId?: string
}>()

const emit = defineEmits<{
  toggle: [content: string, added: boolean]
}>()

const { t } = useI18n()
const apiFetch = useRequestFetch()
const pending = ref<string | null>(null)

const allEmojis = Object.keys(reactionEmojiMap)

const visibleReactions = computed(() =>
  props.reactions.filter(r => r.count > 0),
)

const availableEmojis = computed(() =>
  allEmojis.filter(e => !visibleReactions.value.some(r => r.content === e)),
)

const toast = useToast()

async function toggle(content: string, currentlyReacted: boolean) {
  if (pending.value) return
  pending.value = content

  try {
    await apiFetch('/api/issues/reactions', {
      method: 'POST',
      body: {
        subjectId: props.subjectId,
        content,
        remove: currentlyReacted,
        repo: props.repo,
        issueNumber: props.issueNumber,
        pullCommentId: props.pullCommentId,
        workItemId: props.workItemId,
      },
    })
    emit('toggle', content, !currentlyReacted)
  }
  catch {
    toast.add({ title: t('issues.comment.reactionError'), color: 'error' })
  }
  finally {
    pending.value = null
  }
}
</script>

<template>
  <div class="flex items-center gap-1.5 flex-wrap">
    <button
      v-for="reaction in visibleReactions"
      :key="reaction.content"
      class="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer"
      :class="reaction.viewerHasReacted
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-default bg-elevated/50 hover:border-primary/50'"
      :disabled="pending === reaction.content"
      @click="toggle(reaction.content, reaction.viewerHasReacted)"
    >
      {{ reactionEmojiMap[reaction.content] ?? reaction.content }}
      <span :class="reaction.viewerHasReacted ? 'text-primary' : 'text-muted'">{{ reaction.count }}</span>
    </button>

    <!-- Add reaction picker -->
    <UPopover v-if="availableEmojis.length > 0">
      <button class="inline-flex items-center rounded-full border border-dashed border-default px-3 py-1 text-xs text-muted hover:border-primary/50 hover:text-highlighted transition-colors cursor-pointer">
        <UIcon
          name="i-lucide-smile-plus"
          class="size-3.5"
        />
      </button>

      <template #content>
        <div class="flex gap-1 p-2">
          <button
            v-for="emoji in availableEmojis"
            :key="emoji"
            class="rounded p-1.5 text-base hover:bg-elevated transition-colors cursor-pointer"
            :disabled="pending === emoji"
            @click="toggle(emoji, false)"
          >
            {{ reactionEmojiMap[emoji] }}
          </button>
        </div>
      </template>
    </UPopover>
  </div>
</template>

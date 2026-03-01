<script lang="ts" setup>
defineProps<{
  diffHunk: string
  path: string
  outdated?: boolean
}>()
</script>

<template>
  <div
    class="rounded-md border border-default overflow-hidden font-mono text-xs"
    :class="outdated ? 'opacity-60' : ''"
  >
    <div class="overflow-x-auto">
      <table class="w-full border-collapse">
        <tbody>
          <tr
            v-for="(diffLine, idx) in parseDiffHunk(diffHunk)"
            :key="idx"
            :class="{
              'bg-success/8': diffLine.type === 'add',
              'bg-error/8': diffLine.type === 'remove',
              'bg-elevated/30': diffLine.type === 'header',
            }"
          >
            <!-- Line numbers -->
            <td
              class="select-none text-right px-1.5 py-0 text-dimmed w-8 align-top border-r border-default"
              :class="{
                'text-success/60': diffLine.type === 'add',
                'text-error/60': diffLine.type === 'remove',
              }"
            >
              {{ diffLine.type !== 'add' && diffLine.type !== 'header' ? diffLine.oldLineNumber : '' }}
            </td>
            <td
              class="select-none text-right px-1.5 py-0 text-dimmed w-8 align-top border-r border-default"
              :class="{
                'text-success/60': diffLine.type === 'add',
                'text-error/60': diffLine.type === 'remove',
              }"
            >
              {{ diffLine.type !== 'remove' && diffLine.type !== 'header' ? diffLine.newLineNumber : '' }}
            </td>

            <!-- Marker -->
            <td
              class="select-none w-4 text-center py-0 align-top"
              :class="{
                'text-success': diffLine.type === 'add',
                'text-error': diffLine.type === 'remove',
                'text-dimmed': diffLine.type === 'header',
              }"
            >
              <template v-if="diffLine.type === 'add'">
                +
              </template>
              <template v-else-if="diffLine.type === 'remove'">
                -
              </template>
            </td>

            <!-- Content -->
            <td class="py-0 pr-3 whitespace-pre">
              <span
                v-if="diffLine.type === 'header'"
                class="text-dimmed"
              >{{ diffLine.content }}</span>
              <span v-else>{{ diffLine.content }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

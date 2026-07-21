<template>
  <div
    ref="rootEl"
    class="area"
    tabindex="0"
    @keydown="onKey"
    @click="focusSelf"
  >
    <p v-if="!started && !finished" class="hint">点击此处开始打字</p>
    <div class="text" aria-live="polite">
      <span
        v-for="(ch, i) in chars"
        :key="i"
        :class="[
          'ch',
          statusClass(i),
          { caret: i === caretIndex && !finished },
        ]"
      >{{ displayChar(ch) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { CharStatus } from '../types'

const props = defineProps<{
  text: string
  statuses: CharStatus[]
  caretIndex: number
  started: boolean
  finished: boolean
}>()

const emit = defineEmits<{
  keydown: [KeyboardEvent]
}>()

const rootEl = ref<HTMLElement | null>(null)
const chars = computed(() => [...props.text])

function focusSelf() {
  rootEl.value?.focus()
}

function onKey(e: KeyboardEvent) {
  emit('keydown', e)
}

function statusClass(i: number) {
  return props.statuses[i] || 'pending'
}

function displayChar(ch: string) {
  if (ch === ' ') return '·'
  if (ch === '\n') return '↵\n'
  return ch
}

onMounted(() => focusSelf())
watch(
  () => props.text,
  () => focusSelf(),
)

defineExpose({ focusSelf })
</script>

<style scoped>
.area {
  outline: none;
  padding: 1.25rem 1.1rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--surface);
  min-height: 180px;
  cursor: text;
  animation: fadeIn 0.35s ease;
}

.area:focus {
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.hint {
  margin: 0 0 0.75rem;
  color: var(--ink-muted);
  font-size: 0.9rem;
}

.text {
  font-family: var(--font-mono);
  font-size: 1.15rem;
  line-height: 1.85;
  white-space: pre-wrap;
  word-break: break-word;
}

.ch {
  border-radius: 3px;
}

.ch.pending {
  color: var(--ink-muted);
}

.ch.correct {
  color: var(--correct);
}

.ch.incorrect {
  color: var(--incorrect);
  background: color-mix(in srgb, var(--incorrect) 12%, transparent);
  text-decoration: underline;
  text-decoration-thickness: 2px;
}

.ch.caret {
  box-shadow: inset 0 -2px 0 var(--caret);
  animation: blink 1s steps(1) infinite;
}

@keyframes blink {
  50% {
    box-shadow: inset 0 -2px 0 transparent;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>

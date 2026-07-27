<template>
  <div
    ref="rootEl"
    class="area"
    tabindex="0"
    @keydown="onKey"
    @click="focusSelf"
    @wheel.prevent="onWheel"
  >
    <p v-if="!started && !finished" class="hint">点击此处开始打字</p>
    <div class="text" aria-live="polite" :style="{ fontSize: fontSize + 'rem' }">
      <template v-for="(ch, i) in chars" :key="i">
        <span
          :class="[
            'ch',
            statusClass(i),
            {
              caret: i === caretIndex && !finished,
              space: ch === ' ',
              newline: ch === '\n',
            },
          ]"
        >{{ displayChar(ch) }}</span>
        <!-- 真实断行：仅靠 span 内 \n 在部分浏览器下不会换行 -->
        <br v-if="ch === '\n'" />
      </template>
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

const FONT_KEY = 'typing-practice:area-font-size'
const FONT_DEFAULT = 1.15
const FONT_MIN = 0.8
const FONT_MAX = 2.5
const FONT_STEP = 0.05

const rootEl = ref<HTMLElement | null>(null)
const chars = computed(() => [...props.text])
const fontSize = ref(loadFontSize())

function loadFontSize() {
  const raw = sessionStorage.getItem(FONT_KEY)
  const n = raw != null ? Number(raw) : NaN
  if (!Number.isFinite(n)) return FONT_DEFAULT
  return Math.min(FONT_MAX, Math.max(FONT_MIN, n))
}

function focusSelf() {
  rootEl.value?.focus()
}

function onKey(e: KeyboardEvent) {
  emit('keydown', e)
}

function onWheel(e: WheelEvent) {
  const next = fontSize.value + (e.deltaY < 0 ? FONT_STEP : -FONT_STEP)
  fontSize.value = Math.round(Math.min(FONT_MAX, Math.max(FONT_MIN, next)) * 100) / 100
  sessionStorage.setItem(FONT_KEY, String(fontSize.value))
}

function statusClass(i: number) {
  return props.statuses[i] || 'pending'
}

function displayChar(ch: string) {
  // 空格保持空白；换行显示 ↵，实际断行由模板里的 <br> 负责
  if (ch === '\n') return '↵'
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
  line-height: 1.85;
  white-space: pre-wrap;
  word-break: break-word;
}

.ch {
  border-radius: 3px;
}

/* Slightly wider so caret stays visible on blank spaces */
.ch.space {
  display: inline-block;
  min-width: 0.55em;
}

/* 换行符标记贴在行末，断行由其后的 <br> 完成 */
.ch.newline {
  display: inline-block;
  min-width: 0.7em;
  opacity: 0.55;
}

/* 未输入：浅灰淡化；已正确：深绿加粗，对比更明显 */
.ch.pending {
  color: var(--ink-pending);
  font-weight: 400;
}

.ch.correct {
  color: var(--correct);
  font-weight: 600;
}

.ch.incorrect {
  color: var(--incorrect);
  font-weight: 600;
  background: color-mix(in srgb, var(--incorrect) 14%, transparent);
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

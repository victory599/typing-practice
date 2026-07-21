<template>
  <div class="bar">
    <div>
      <span class="label">WPM</span>
      <strong>{{ metrics.wpm }}</strong>
    </div>
    <div>
      <span class="label">准确率</span>
      <strong>{{ metrics.accuracy }}%</strong>
    </div>
    <div>
      <span class="label">{{ metrics.remainingMs != null ? '剩余' : '用时' }}</span>
      <strong>{{ timeLabel }}</strong>
    </div>
    <div>
      <span class="label">进度</span>
      <strong>{{ metrics.progress }}%</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TypingMetrics } from '../composables/useTypingEngine'

const props = defineProps<{ metrics: TypingMetrics }>()

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

const timeLabel = computed(() => {
  if (props.metrics.remainingMs != null) return formatMs(props.metrics.remainingMs)
  return formatMs(props.metrics.elapsedMs)
})
</script>

<style scoped>
.bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.bar > div {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
}

.label {
  display: block;
  font-size: 0.75rem;
  color: var(--ink-muted);
  margin-bottom: 0.2rem;
}

strong {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .bar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

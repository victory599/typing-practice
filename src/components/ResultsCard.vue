<template>
  <section class="card panel">
    <h2>本轮结果</h2>
    <p class="meta">{{ textTitle }} · {{ modeLabel }}</p>
    <dl class="grid">
      <div>
        <dt>WPM</dt>
        <dd>{{ metrics.wpm }}</dd>
      </div>
      <div>
        <dt>准确率</dt>
        <dd>{{ metrics.accuracy }}%</dd>
      </div>
      <div>
        <dt>用时</dt>
        <dd>{{ duration }}</dd>
      </div>
      <div>
        <dt>错误</dt>
        <dd>{{ metrics.errorCount }}</dd>
      </div>
    </dl>
    <div class="actions">
      <button type="button" class="btn btn-primary" @click="$emit('retry')">再练一次</button>
      <button type="button" class="btn btn-secondary" @click="$emit('change')">换一篇</button>
      <button type="button" class="btn btn-secondary" @click="$emit('library')">去词库</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PracticeMode } from '../types'
import type { TypingMetrics } from '../composables/useTypingEngine'

const props = defineProps<{
  textTitle: string
  mode: PracticeMode
  metrics: TypingMetrics
}>()

defineEmits<{ retry: []; change: []; library: [] }>()

const modeLabel = computed(() => {
  const map: Record<PracticeMode, string> = {
    free: '自由模式',
    'timed-1': '限时 1 分钟',
    'timed-3': '限时 3 分钟',
    'timed-5': '限时 5 分钟',
  }
  return map[props.mode]
})

const duration = computed(() => {
  const s = Math.floor(props.metrics.elapsedMs / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
})
</script>

<style scoped>
.card {
  margin-top: 1.25rem;
  animation: rise 0.35s ease;
}

h2 {
  margin: 0;
  font-size: 1.35rem;
}

.meta {
  margin: 0.35rem 0 1rem;
  color: var(--ink-muted);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1rem;
  margin: 0 0 1.25rem;
}

dt {
  font-size: 0.75rem;
  color: var(--ink-muted);
}

dd {
  margin: 0.15rem 0 0;
  font-family: var(--font-display);
  font-size: 1.5rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>

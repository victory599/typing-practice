<template>
  <div class="share-page">
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="toast"
          class="toast"
          :class="toast.type === 'error' ? 'toast-error' : 'toast-ok'"
          role="status"
        >
          {{ toast.text }}
        </div>
      </Transition>
    </Teleport>

    <div v-if="loading" class="share-status">
      <p class="share-status-text muted">加载分享内容…</p>
    </div>
    <div v-else-if="error" class="share-status">
      <p class="share-status-text share-status-error">{{ error }}</p>
    </div>

    <template v-else-if="record">
      <p class="tip">下方为分享内容；生成后可长按缩略图保存。</p>

      <div ref="posterRef" class="poster">
        <div class="poster-brand">TypeLocal</div>

        <template v-if="single">
          <h1 class="poster-title">练习成绩</h1>
          <p class="poster-sub">{{ single.textTitle }}</p>
          <div class="poster-metrics">
            <div class="metric">
              <span class="metric-val">{{ single.wpm }}</span>
              <span class="metric-label">WPM</span>
            </div>
            <div class="metric">
              <span class="metric-val">{{ single.accuracy }}%</span>
              <span class="metric-label">准确率</span>
            </div>
            <div class="metric">
              <span class="metric-val">{{ formatDuration(single.durationMs) }}</span>
              <span class="metric-label">用时</span>
            </div>
          </div>
          <p class="poster-meta">
            {{ modeLabel(single.mode) }}（模式） · {{ formatTime(single.createdAt) }}
          </p>
        </template>

        <template v-else-if="stats">
          <h1 class="poster-title">成绩汇总</h1>
          <p class="poster-sub">
            {{ stats.filter.modeLabel }}
            <template v-if="stats.filter.titleQuery">
              · 文本含「{{ stats.filter.titleQuery }}」
            </template>
          </p>
          <div class="poster-metrics">
            <div class="metric">
              <span class="metric-val">{{ stats.summary.count }}</span>
              <span class="metric-label">条数</span>
            </div>
            <div class="metric">
              <span class="metric-val">{{ stats.summary.avgWpm }}</span>
              <span class="metric-label">平均 WPM</span>
            </div>
            <div class="metric">
              <span class="metric-val">{{ stats.summary.maxWpm }}</span>
              <span class="metric-label">最高 WPM</span>
            </div>
            <div class="metric">
              <span class="metric-val">{{ stats.summary.avgAccuracy }}%</span>
              <span class="metric-label">平均准确率</span>
            </div>
          </div>

          <div v-if="pieData.labels?.length" class="poster-chart">
            <h2>模式分布</h2>
            <div class="poster-chart-box poster-chart-pie">
              <Pie :data="pieData" :options="pieOptions" />
            </div>
          </div>
          <div v-if="wpmData.labels?.length" class="poster-chart">
            <h2>近期 WPM</h2>
            <div class="poster-chart-box">
              <Bar :data="wpmData" :options="barOptions" />
            </div>
          </div>
          <div v-if="accData.labels?.length" class="poster-chart">
            <h2>近期准确率</h2>
            <div class="poster-chart-box">
              <Bar :data="accData" :options="barOptions" />
            </div>
          </div>
        </template>
      </div>

      <div v-if="posterUrl" class="preview-row" :class="{ 'preview-busy': posterBusy }">
        <span class="preview-hint">长按右侧缩略图保存</span>
        <img class="poster-thumb" :src="posterUrl" alt="分享图，长按保存" />
      </div>
      <p v-else-if="posterBusy" class="muted">正在生成图片…</p>
      <p v-else-if="posterError" class="error-text">{{ posterError }}</p>

      <button
        type="button"
        class="btn btn-primary regen"
        :disabled="posterBusy"
        @click="renderPoster"
      >
        {{ posterBusy ? '正在生成…' : '重新生成图片' }}
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { toPng } from 'html-to-image'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Bar, Pie } from 'vue-chartjs'
import * as api from '../api/client'
import type {
  PracticeMode,
  ShareRecord,
  ShareSinglePayload,
  ShareStatsPayload,
} from '../types'
import { modeLabel } from '../utils/sharePayload'

ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement)

const modeColors: Record<PracticeMode, string> = {
  free: '#0f7a6c',
  'timed-1': '#3a9b8a',
  'timed-3': '#6bb8a8',
  'timed-5': '#9ad4c8',
}

const route = useRoute()
const loading = ref(true)
const error = ref('')
const record = ref<ShareRecord | null>(null)
const posterRef = ref<HTMLElement | null>(null)
const posterUrl = ref('')
const posterBusy = ref(false)
const posterError = ref('')
const toast = ref<{ text: string; type: 'ok' | 'error' } | null>(null)
let toastTimer: number | undefined

function showToast(text: string, type: 'ok' | 'error' = 'ok') {
  toast.value = { text, type }
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = null
    toastTimer = undefined
  }, 2500)
}

const single = computed(() =>
  record.value?.kind === 'single'
    ? (record.value.payload as ShareSinglePayload)
    : null,
)

const stats = computed(() =>
  record.value?.kind === 'stats'
    ? (record.value.payload as ShareStatsPayload)
    : null,
)

const pieData = computed<ChartData<'pie'>>(() => {
  const s = stats.value
  if (!s) return { labels: [], datasets: [] }
  const modes = Object.keys(s.modeCounts) as PracticeMode[]
  return {
    labels: modes.map((m) => modeLabel(m)),
    datasets: [
      {
        data: modes.map((m) => s.modeCounts[m] || 0),
        backgroundColor: modes.map((m) => modeColors[m] || '#5a717a'),
        borderWidth: 0,
      },
    ],
  }
})

const wpmData = computed<ChartData<'bar'>>(() => {
  const s = stats.value
  if (!s) return { labels: [], datasets: [] }
  return {
    labels: s.recent.map((r) => r.timeLabel),
    datasets: [
      {
        label: 'WPM',
        data: s.recent.map((r) => r.wpm),
        backgroundColor: '#0f7a6c',
        borderRadius: 4,
      },
    ],
  }
})

const accData = computed<ChartData<'bar'>>(() => {
  const s = stats.value
  if (!s) return { labels: [], datasets: [] }
  return {
    labels: s.recent.map((r) => r.timeLabel),
    datasets: [
      {
        label: '准确率 %',
        data: s.recent.map((r) => r.accuracy),
        backgroundColor: '#3a9b8a',
        borderRadius: 4,
      },
    ],
  }
})

const pieOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: { legend: { position: 'bottom' } },
}

const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 8 } },
    y: { beginAtZero: true },
  },
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString()
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

async function load() {
  loading.value = true
  error.value = ''
  record.value = null
  posterUrl.value = ''
  try {
    const id = String(route.params.id || '')
    record.value = await api.getShare(id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '分享不存在或已失效'
  } finally {
    loading.value = false
  }
}

async function renderPoster() {
  if (!posterRef.value) return
  const regenerating = Boolean(posterUrl.value)
  posterBusy.value = true
  posterError.value = ''
  try {
    // 等图表完成一帧绘制
    await nextTick()
    await new Promise((r) => setTimeout(r, 120))
    posterUrl.value = await toPng(posterRef.value, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#f4faf8',
    })
    if (regenerating) {
      showToast('缩略图已更新，可长按保存')
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '生成图片失败'
    posterError.value = msg
    if (regenerating) showToast(msg, 'error')
  } finally {
    posterBusy.value = false
  }
}

watch(
  () => record.value?.id,
  async (id) => {
    if (!id) return
    await nextTick()
    await renderPoster()
  },
)

onMounted(load)
</script>

<style scoped>
.share-page {
  max-width: 420px;
  margin: 0 auto;
}

.share-status {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: min(60vh, 420px);
  padding: 2rem 1.25rem;
  text-align: center;
}

.share-status-text {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 600;
  line-height: 1.45;
}

.share-status-error {
  color: var(--incorrect);
}

.tip {
  margin: 0 0 1rem;
  color: var(--ink-muted);
  font-size: 0.92rem;
  line-height: 1.45;
}

.poster {
  width: 360px;
  max-width: 100%;
  margin: 0 auto 1rem;
  padding: 1.35rem 1.2rem 1.5rem;
  border-radius: 16px;
  background: linear-gradient(165deg, #f4faf8 0%, #e8f3ef 55%, #dceee8 100%);
  border: 1px solid #c5ddd4;
  color: #1a2b32;
  box-sizing: border-box;
}

.poster-brand {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -0.02em;
  color: #0f7a6c;
  margin-bottom: 0.75rem;
}

.poster-title {
  margin: 0 0 0.35rem;
  font-family: var(--font-display);
  font-size: 1.35rem;
}

.poster-sub {
  margin: 0 0 1rem;
  color: #5a717a;
  font-size: 0.92rem;
  word-break: break-word;
}

.poster-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.65rem;
  margin-bottom: 0.85rem;
}

.metric {
  background: rgba(255, 255, 255, 0.72);
  border-radius: 10px;
  padding: 0.65rem 0.5rem;
  text-align: center;
}

.metric-val {
  display: block;
  font-size: 1.35rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #0f7a6c;
}

.metric-label {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.75rem;
  color: #5a717a;
}

.poster-meta {
  margin: 0;
  font-size: 0.8rem;
  color: #5a717a;
  text-align: center;
}

.poster-chart {
  margin-top: 1rem;
}

.poster-chart h2 {
  margin: 0 0 0.4rem;
  font-size: 0.85rem;
  color: #5a717a;
  font-weight: 600;
}

.poster-chart-box {
  height: 160px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 10px;
  padding: 0.35rem;
}

.poster-chart-pie {
  height: 180px;
}

.preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.65rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.45);
}

.preview-busy {
  opacity: 0.55;
}

.preview-hint {
  flex: 1;
  min-width: 0;
  color: orangered;
  font-size: 1.2rem;
  font-weight: 600;
  line-height: 1.35;
}

.poster-thumb {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  object-fit: cover;
  object-position: top center;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #e8f3ef;
}

.regen {
  margin-top: 1rem;
  width: 100%;
}
</style>

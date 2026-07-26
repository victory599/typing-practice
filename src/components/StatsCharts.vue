<template>
  <section class="charts-section panel">
    <div class="charts-head">
      <div>
        <h2 class="charts-title">成绩图表</h2>
        <p class="charts-desc">
          可对当前筛选后的全部成绩生成可视化统计（非当前页）。共
          <strong>{{ results.length }}</strong> 条可统计。
        </p>
      </div>
      <div class="charts-actions">
        <template v-if="!generated">
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!results.length"
            @click="generate"
          >
            生成图表
          </button>
        </template>
        <template v-else>
          <button type="button" class="btn btn-primary" @click="generate">
            重新生成
          </button>
          <button type="button" class="btn btn-secondary" @click="clearCharts">
            清空图表
          </button>
        </template>
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="!results.length || shareBusy"
          @click="shareStats"
        >
          分享图表/汇总
        </button>
      </div>
    </div>

    <p v-if="stale" class="stale-tip">筛选条件或数据已变化，图表可能过期，可点击「重新生成」。</p>

    <p v-if="!generated" class="idle-tip">
      尚未生成图表。点击「生成图表」后将展示：模式分布饼图、近期 WPM 条形图、准确率条形图。
    </p>

    <div v-else class="charts-grid">
      <div class="chart-card">
        <h3>模式分布</h3>
        <div class="chart-box chart-box-pie">
          <Pie :data="pieData" :options="pieOptions" />
        </div>
      </div>
      <div class="chart-card">
        <h3>近期 WPM（最多 {{ maxBars }} 条）</h3>
        <div class="chart-box">
          <Bar :data="wpmData" :options="barOptions" />
        </div>
      </div>
      <div class="chart-card">
        <h3>近期准确率（最多 {{ maxBars }} 条）</h3>
        <div class="chart-box">
          <Bar :data="accData" :options="barOptions" />
        </div>
      </div>
    </div>

    <ShareQrDialog
      :open="shareOpen"
      :share-url="shareUrl"
      :expires-at="shareExpiresAt"
      :loading="shareBusy"
      :error="shareError"
      @close="closeShare"
    />
  </section>
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
import { computed, ref, watch } from 'vue'
import { Bar, Pie } from 'vue-chartjs'
import * as api from '../api/client'
import type { PracticeMode, RunResult } from '../types'
import { buildStatsPayload } from '../utils/sharePayload'
import ShareQrDialog from './ShareQrDialog.vue'

ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement)

const props = defineProps<{
  results: RunResult[]
  filterMode?: '' | PracticeMode
  filterTitle?: string
}>()

const maxBars = 20

const modeLabels: Record<PracticeMode, string> = {
  free: '自由',
  'timed-1': '1 分钟',
  'timed-3': '3 分钟',
  'timed-5': '5 分钟',
}

const modeColors: Record<PracticeMode, string> = {
  free: '#0f7a6c',
  'timed-1': '#3a9b8a',
  'timed-3': '#6bb8a8',
  'timed-5': '#9ad4c8',
}

const generated = ref(false)
const stale = ref(false)
/** 生成时快照的结果指纹，用于判断筛选是否变化 */
const snapshotKey = ref('')

const pieData = ref<ChartData<'pie'>>({ labels: [], datasets: [] })
const wpmData = ref<ChartData<'bar'>>({ labels: [], datasets: [] })
const accData = ref<ChartData<'bar'>>({ labels: [], datasets: [] })

const shareOpen = ref(false)
const shareBusy = ref(false)
const shareUrl = ref('')
const shareExpiresAt = ref<number | null>(null)
const shareError = ref('')

const pieOptions = computed<ChartOptions<'pie'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' },
  },
}))

const barOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      ticks: { maxRotation: 45, minRotation: 0, autoSkip: true, maxTicksLimit: 10 },
    },
    y: { beginAtZero: true },
  },
}))

function resultsKey(list: RunResult[]) {
  return `${list.length}:${list.map((r) => r.id).join(',')}`
}

function shortTime(ts: number) {
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${mi}`
}

function buildCharts(list: RunResult[]) {
  const counts = new Map<PracticeMode, number>()
  for (const r of list) {
    counts.set(r.mode, (counts.get(r.mode) || 0) + 1)
  }
  const modes = [...counts.keys()]
  pieData.value = {
    labels: modes.map((m) => modeLabels[m] || m),
    datasets: [
      {
        data: modes.map((m) => counts.get(m) || 0),
        backgroundColor: modes.map((m) => modeColors[m] || '#5a717a'),
        borderWidth: 0,
      },
    ],
  }

  const recent = [...list]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, maxBars)
    .reverse()

  const labels = recent.map((r) => shortTime(r.createdAt))

  wpmData.value = {
    labels,
    datasets: [
      {
        label: 'WPM',
        data: recent.map((r) => r.wpm),
        backgroundColor: '#0f7a6c',
        borderRadius: 4,
      },
    ],
  }

  accData.value = {
    labels,
    datasets: [
      {
        label: '准确率 %',
        data: recent.map((r) => r.accuracy),
        backgroundColor: '#3a9b8a',
        borderRadius: 4,
      },
    ],
  }
}

function generate() {
  if (!props.results.length) return
  buildCharts(props.results)
  snapshotKey.value = resultsKey(props.results)
  stale.value = false
  generated.value = true
}

function clearCharts() {
  generated.value = false
  stale.value = false
  snapshotKey.value = ''
  pieData.value = { labels: [], datasets: [] }
  wpmData.value = { labels: [], datasets: [] }
  accData.value = { labels: [], datasets: [] }
}

function closeShare() {
  shareOpen.value = false
  shareBusy.value = false
  shareUrl.value = ''
  shareExpiresAt.value = null
  shareError.value = ''
}

async function shareStats() {
  if (!props.results.length) return
  shareOpen.value = true
  shareBusy.value = true
  shareUrl.value = ''
  shareExpiresAt.value = null
  shareError.value = ''
  try {
    const payload = buildStatsPayload(props.results, {
      mode: props.filterMode ?? '',
      titleQuery: props.filterTitle ?? '',
    })
    const created = await api.createShare('stats', payload, 'stats_latest')
    shareUrl.value = `${window.location.origin}${created.urlPath}`
    shareExpiresAt.value = created.expiresAt
  } catch (e) {
    shareError.value = e instanceof Error ? e.message : '创建分享失败'
  } finally {
    shareBusy.value = false
  }
}

watch(
  () => resultsKey(props.results),
  (key) => {
    if (!generated.value) return
    stale.value = key !== snapshotKey.value
    if (!props.results.length) {
      clearCharts()
    }
  },
)
</script>

<style scoped>
.charts-section {
  margin-top: 1.5rem;
}

.charts-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.charts-title {
  margin: 0 0 0.35rem;
  font-size: 1.15rem;
}

.charts-desc {
  margin: 0;
  color: var(--ink-muted);
  font-size: 0.92rem;
  line-height: 1.45;
  max-width: 36rem;
}

.charts-desc strong {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.charts-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.charts-actions .btn-primary {
  /* 相对同级控件仅略收垂直边距，缓和实心色的视觉膨胀 */
  margin: 0.05rem 0;
}

.charts-actions .btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.idle-tip,
.stale-tip {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  line-height: 1.45;
}

.idle-tip {
  color: var(--ink-muted);
}

.stale-tip {
  color: #8a5a12;
  background: #f8f0e0;
  border: 1px solid #e6d4b0;
  border-radius: 8px;
  padding: 0.55rem 0.75rem;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.chart-card h3 {
  margin: 0 0 0.65rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink-muted);
}

.chart-box {
  position: relative;
  height: 240px;
}

.chart-box-pie {
  height: 260px;
  max-width: 360px;
  margin: 0 auto;
}

@media (min-width: 900px) {
  .charts-grid {
    grid-template-columns: 1fr 1fr;
  }

  .chart-card:first-child {
    grid-column: 1 / -1;
  }
}
</style>

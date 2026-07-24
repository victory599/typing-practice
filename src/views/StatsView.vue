<template>
  <div>
    <h1 class="page-title">统计</h1>
    <p class="page-desc">查看本机保存的练习成绩，可随时手动清空。</p>

    <p v-if="error" class="error-text">{{ error }}</p>

    <div class="actions">
      <button type="button" class="btn btn-danger" :disabled="!results.length" @click="clearAll">
        清空成绩历史
      </button>
    </div>

    <p v-if="!results.length" class="muted">暂无成绩记录。</p>

    <template v-else>
      <div class="filters">
        <div class="field filter-field">
          <label for="stats-mode">模式</label>
          <select id="stats-mode" v-model="modeFilter">
            <option value="">全部模式</option>
            <option v-for="m in modeOptions" :key="m.value" :value="m.value">
              {{ m.label }}
            </option>
          </select>
        </div>
        <div class="field filter-field filter-search">
          <label for="stats-title">文本</label>
          <div class="search-row">
            <input
              id="stats-title"
              v-model="titleInput"
              type="search"
              placeholder="模糊搜索文本标题"
              autocomplete="off"
              @keydown.enter.prevent="applyTitleSearch"
            />
            <button type="button" class="btn btn-primary" @click="applyTitleSearch">
              搜索
            </button>
          </div>
        </div>
      </div>

      <p v-if="!filtered.length" class="muted">没有符合筛选条件的记录。</p>

      <template v-else>
        <div class="table-wrap panel">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>文本</th>
                <th>模式</th>
                <th>WPM</th>
                <th>准确率</th>
                <th>用时</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in pageItems" :key="r.id">
                <td>{{ formatTime(r.createdAt) }}</td>
                <td>{{ r.textTitle }}</td>
                <td>{{ modeLabel(r.mode) }}</td>
                <td>{{ r.wpm }}</td>
                <td>{{ r.accuracy }}%</td>
                <td>{{ formatDuration(r.durationMs) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pager">
          <button
            type="button"
            class="btn btn-secondary"
            :disabled="page <= 1"
            @click="page -= 1"
          >
            上一页
          </button>
          <span class="pager-info">
            第 {{ page }} / {{ totalPages }} 页 · 共 {{ filtered.length }} 条
            <template v-if="filtered.length !== results.length">
              （全部 {{ results.length }}）
            </template>
          </span>
          <button
            type="button"
            class="btn btn-secondary"
            :disabled="page >= totalPages"
            @click="page += 1"
          >
            下一页
          </button>
        </div>
      </template>

      <!-- 基于当前筛选全部记录；不自动生成，由组件内按钮触发 -->
      <StatsCharts :results="filtered" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import * as api from '../api/client'
import StatsCharts from '../components/StatsCharts.vue'
import type { PracticeMode, RunResult } from '../types'

const PAGE_SIZE = 10

const modeOptions: { value: PracticeMode; label: string }[] = [
  { value: 'free', label: '自由' },
  { value: 'timed-1', label: '1 分钟' },
  { value: 'timed-3', label: '3 分钟' },
  { value: 'timed-5', label: '5 分钟' },
]

const results = ref<RunResult[]>([])
const error = ref('')
const page = ref(1)
/** 输入框草稿，不直接参与筛选 */
const titleInput = ref('')
/** 已确认的文本关键词，点搜索或回车后才更新 */
const titleQuery = ref('')
const modeFilter = ref<'' | PracticeMode>('')

const filtered = computed(() => {
  const q = titleQuery.value.toLowerCase()
  const mode = modeFilter.value
  return results.value.filter((r) => {
    if (mode && r.mode !== mode) return false
    if (q && !r.textTitle.toLowerCase().includes(q)) return false
    return true
  })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)),
)

const pageItems = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

function applyTitleSearch() {
  titleQuery.value = titleInput.value.trim()
  page.value = 1
}

watch(modeFilter, () => {
  page.value = 1
})

watch(totalPages, (n) => {
  if (page.value > n) page.value = n
})

function modeLabel(mode: PracticeMode) {
  return modeOptions.find((m) => m.value === mode)?.label || mode
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
  error.value = ''
  try {
    results.value = await api.listResults()
    page.value = 1
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  }
}

async function clearAll() {
  if (!confirm('确定清空全部成绩历史吗？此操作不可撤销。')) return
  try {
    await api.clearResults()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '清空失败'
  }
}

onMounted(load)
</script>

<style scoped>
.actions {
  margin-bottom: 1rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem 1rem;
  margin-bottom: 1rem;
  width: 100%;
}

.filter-field {
  margin-bottom: 0;
  flex: 0 0 240px;
}

.filter-search {
  flex: 1 1 0;
  min-width: 200px;
}

.search-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.search-row input {
  flex: 1 1 auto;
  min-width: 0;
}

.search-row .btn {
  flex: 0 0 auto;
  white-space: nowrap;
  /* 相对同级控件仅略收垂直边距，缓和实心色的视觉膨胀 */
  margin: 0.05rem 0;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}

th,
td {
  text-align: left;
  padding: 0.65rem 0.5rem;
  border-bottom: 1px solid var(--border);
}

th {
  color: var(--ink-muted);
  font-weight: 600;
  font-size: 0.8rem;
}

td:nth-child(4),
td:nth-child(5),
td:nth-child(6) {
  font-variant-numeric: tabular-nums;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.pager-info {
  color: var(--ink-muted);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
}

.pager .btn-secondary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

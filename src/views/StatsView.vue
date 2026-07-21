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

    <div v-else class="table-wrap panel">
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
          <tr v-for="r in results" :key="r.id">
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as api from '../api/client'
import type { PracticeMode, RunResult } from '../types'

const results = ref<RunResult[]>([])
const error = ref('')

function modeLabel(mode: PracticeMode) {
  const map: Record<PracticeMode, string> = {
    free: '自由',
    'timed-1': '1 分钟',
    'timed-3': '3 分钟',
    'timed-5': '5 分钟',
  }
  return map[mode] || mode
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
</style>

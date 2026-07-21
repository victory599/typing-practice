<template>
  <div>
    <h1 class="page-title">设置</h1>
    <p class="page-desc">
      配置目录固定在应用根下，不可修改。数据目录默认同根，可迁移到其他本机路径（移动文件，不留双份）。
    </p>

    <p v-if="error" class="error-text">{{ error }}</p>
    <p v-if="okMsg" class="muted">{{ okMsg }}</p>

    <section class="panel">
      <h2>路径</h2>
      <div class="row">
        <span class="label">配置目录（固定）</span>
        <code>{{ settings?.configPath || '—' }}</code>
      </div>
      <div class="row">
        <span class="label">当前数据目录</span>
        <code>{{ settings?.resolvedDataPath || '—' }}</code>
      </div>
      <div class="row">
        <span class="label">默认数据目录</span>
        <code>{{ settings?.defaultDataPath || '—' }}</code>
      </div>

      <div class="field">
        <label for="dataPath">数据目录路径</label>
        <input
          id="dataPath"
          v-model="dataPathInput"
          type="text"
          placeholder="留空表示恢复应用根下默认 data/"
        />
        <span class="tip">可填绝对路径，或相对应用根的路径。保存后会将 texts.json / results.json 移动到新位置。</span>
      </div>
      <button type="button" class="btn btn-primary" :disabled="migrating" @click="migrate">
        {{ migrating ? '迁移中…' : '迁移数据目录' }}
      </button>
    </section>

    <section class="panel" style="margin-top: 1rem">
      <h2>练习偏好</h2>
      <div class="field">
        <label for="defaultMode">默认练习模式</label>
        <select id="defaultMode" v-model="defaultMode">
          <option value="free">自由练完</option>
          <option value="timed-1">限时 1 分钟</option>
          <option value="timed-3">限时 3 分钟</option>
          <option value="timed-5">限时 5 分钟</option>
        </select>
      </div>
      <button type="button" class="btn btn-secondary" @click="savePrefs">保存偏好</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as api from '../api/client'
import type { AppSettings, PracticeMode } from '../types'

const settings = ref<AppSettings | null>(null)
const dataPathInput = ref('')
const defaultMode = ref<PracticeMode>('free')
const migrating = ref(false)
const error = ref('')
const okMsg = ref('')

async function load() {
  error.value = ''
  try {
    const s = await api.getSettings()
    settings.value = s
    dataPathInput.value = s.dataPath || ''
    defaultMode.value = s.defaultMode || 'free'
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  }
}

async function migrate() {
  if (
    !confirm(
      '确定迁移数据目录吗？将移动 texts.json 与 results.json 到新路径（不是复制）。',
    )
  ) {
    return
  }
  migrating.value = true
  error.value = ''
  okMsg.value = ''
  try {
    const s = await api.migrateDataPath(dataPathInput.value.trim())
    settings.value = s
    dataPathInput.value = s.dataPath || ''
    okMsg.value = `已迁移到：${s.resolvedDataPath}`
  } catch (e) {
    error.value = e instanceof Error ? e.message : '迁移失败'
  } finally {
    migrating.value = false
  }
}

async function savePrefs() {
  error.value = ''
  okMsg.value = ''
  try {
    await api.updateSettings({ defaultMode: defaultMode.value })
    okMsg.value = '偏好已保存'
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  }
}

onMounted(load)
</script>

<style scoped>
h2 {
  margin: 0 0 1rem;
  font-size: 1.15rem;
}

.row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 0.5rem 1rem;
  margin-bottom: 0.75rem;
  align-items: start;
}

.label {
  color: var(--ink-muted);
  font-size: 0.9rem;
}

code {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  word-break: break-all;
  background: color-mix(in srgb, var(--accent-soft) 40%, white);
  padding: 0.25rem 0.4rem;
  border-radius: 6px;
}

.tip {
  font-size: 0.8rem;
  color: var(--ink-muted);
}

@media (max-width: 640px) {
  .row {
    grid-template-columns: 1fr;
  }
}
</style>

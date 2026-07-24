<template>
  <div>
    <h1 class="page-title">设置</h1>
    <p class="page-desc">
      配置目录固定在应用根下，不可修改。数据目录默认同根，可迁移到其他本机路径（移动文件，不留双份）。
    </p>

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

    <Teleport to="body">
      <div v-if="confirmDialog" class="modal-mask" @click.self="closeConfirm">
        <div class="modal-panel" role="dialog" aria-modal="true">
          <h3 class="modal-title">{{ confirmDialog.title }}</h3>
          <p class="modal-body">{{ confirmDialog.message }}</p>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeConfirm">
              取消
            </button>
            <button type="button" class="btn btn-primary" @click="acceptConfirm">
              确定
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <section class="panel">
      <h2>路径</h2>
      <div class="row">
        <span class="label">配置目录（固定）</span>
        <code>{{ settings?.configPath || '—' }}</code>
      </div>
      <div class="row">
        <span class="label">默认数据目录</span>
        <code>{{ settings?.defaultDataPath || '—' }}</code>
      </div>
      <div class="row">
        <span class="label">当前数据目录</span>
        <code>{{ settings?.resolvedDataPath || '—' }}</code>
      </div>

      <div class="field">
        <label for="dataPath">数据目录路径</label>
        <div class="path-row">
          <input
            id="dataPath"
            v-model="dataPathInput"
            type="text"
            placeholder="输入或选择数据目录路径（留空表示恢复应用根下默认 data/）"
          />
          <button
            type="button"
            class="btn btn-secondary"
            :disabled="picking || migrating"
            @click="pickDir"
          >
            {{ picking ? '选择中…' : '选择目录' }}
          </button>
        </div>
        <span class="tip">可填绝对路径，或相对应用根的路径；也可点「选择目录」选取。</span>
      </div>
      <div class="actions">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!canConfirm"
          @click="migrate"
        >
          {{ migrating ? '迁移中…' : '确认' }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="!canRestore"
          @click="restoreDefault"
        >
          恢复默认
        </button>
      </div>
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import * as api from '../api/client'
import type { AppSettings, PracticeMode } from '../types'

const settings = ref<AppSettings | null>(null)
const dataPathInput = ref('')
const defaultMode = ref<PracticeMode>('free')
const migrating = ref(false)
const picking = ref(false)

const toast = ref<{ text: string; type: 'ok' | 'error' } | null>(null)
let toastTimer: number | undefined

type ConfirmDialog = {
  title: string
  message: string
  onConfirm: () => void | Promise<void>
}
const confirmDialog = ref<ConfirmDialog | null>(null)

function showToast(text: string, type: 'ok' | 'error' = 'ok') {
  toast.value = { text, type }
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = null
    toastTimer = undefined
  }, 3000)
}

function closeConfirm() {
  confirmDialog.value = null
}

async function acceptConfirm() {
  const action = confirmDialog.value?.onConfirm
  confirmDialog.value = null
  if (action) await action()
}

/** 当前是否已在默认数据目录 */
const isAtDefault = computed(() => {
  if (!settings.value) return true
  return settings.value.resolvedDataPath === settings.value.defaultDataPath
})

/**
 * 确认：输入了与当前配置不同的非空路径时可点。
 * 空输入不走确认（请用「恢复默认」），避免确认后清空输入框又误亮起。
 */
const canConfirm = computed(() => {
  if (migrating.value || !settings.value) return false
  const next = dataPathInput.value.trim()
  if (!next) return false
  const currentStored = (settings.value.dataPath || '').trim()
  // 选择目录得到绝对路径时，与已存绝对/相对路径都要比一下解析结果
  const currentResolved = settings.value.resolvedDataPath
  if (next === currentStored || next === currentResolved) return false
  return true
})

/** 恢复默认：仅当当前不在默认目录时可点 */
const canRestore = computed(() => {
  if (migrating.value || !settings.value) return false
  return !isAtDefault.value
})

async function load() {
  try {
    const s = await api.getSettings()
    settings.value = s
    // 输入框只作「待迁移」草稿，不回填已保存路径
    dataPathInput.value = ''
    defaultMode.value = s.defaultMode || 'free'
  } catch (e) {
    showToast(e instanceof Error ? e.message : '加载失败', 'error')
  }
}

async function pickDir() {
  picking.value = true
  try {
    const result = await api.pickDirectory()
    if (result.cancelled || !result.path) return
    dataPathInput.value = result.path
  } catch (e) {
    showToast(e instanceof Error ? e.message : '选择目录失败', 'error')
  } finally {
    picking.value = false
  }
}

async function runMigrate(path: string, okPrefix: string) {
  migrating.value = true
  try {
    const s = await api.migrateDataPath(path)
    settings.value = s
    // 迁移成功后统一清空，手动输入与选择目录行为一致
    dataPathInput.value = ''
    showToast(`${okPrefix}${s.resolvedDataPath}`)
  } catch (e) {
    showToast(e instanceof Error ? e.message : '迁移失败', 'error')
  } finally {
    migrating.value = false
  }
}

function migrate() {
  const target = dataPathInput.value.trim()
  confirmDialog.value = {
    title: '确认迁移数据目录',
    message: `将移动 texts.json 与 results.json 到新路径：\n${target}`,
    onConfirm: () => runMigrate(target, '已迁移到：'),
  }
}

function restoreDefault() {
  confirmDialog.value = {
    title: '确认恢复默认目录',
    message:
      '将移动 texts.json 与 results.json 回应用根下默认位置。确定继续吗？',
    onConfirm: () => runMigrate('', '已恢复默认目录：'),
  }
}

async function savePrefs() {
  try {
    await api.updateSettings({ defaultMode: defaultMode.value })
    showToast('偏好已保存')
    await load()
  } catch (e) {
    showToast(e instanceof Error ? e.message : '保存失败', 'error')
  }
}

onMounted(load)
onBeforeUnmount(() => {
  if (toastTimer) window.clearTimeout(toastTimer)
})
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
  background: color-mix(in srgb, var(--border) 28%, white);
  padding: 0.25rem 0.4rem;
  border-radius: 6px;
}

.tip {
  font-size: 0.8rem;
  color: var(--ink-muted);
}

.path-row {
  display: flex;
  gap: 0.5rem;
  align-items: stretch;
}

.path-row input {
  flex: 1 1 auto;
  min-width: 0;
}

.path-row .btn {
  flex: 0 0 auto;
  white-space: nowrap;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.actions .btn-primary {
  /* 相对同级控件仅略收垂直边距，缓和实心色的视觉膨胀 */
  margin: 0.05rem 0;
}

.actions .btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.toast {
  position: fixed;
  top: 1.25rem;
  left: 50%;
  z-index: 1000;
  max-width: min(92vw, 480px);
  padding: 0.9rem 1.35rem;
  border-radius: 12px;
  font-size: 1rem;
  line-height: 1.45;
  box-shadow: var(--shadow);
  pointer-events: none;
  transform: translateX(-50%);
}

.toast-ok {
  background: var(--accent);
  color: #fff;
  border: 1px solid #0c6559;
}

.toast-error {
  background: var(--incorrect);
  color: #fff;
  border: 1px solid #a83232;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(26, 43, 50, 0.4);
}

.modal-panel {
  width: min(100%, 420px);
  padding: 1.25rem 1.35rem;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.modal-title {
  margin: 0 0 0.65rem;
  font-family: var(--font-display);
  font-size: 1.15rem;
}

.modal-body {
  margin: 0 0 1.15rem;
  color: var(--ink-muted);
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.modal-actions .btn-primary {
  /* 相对同级控件仅略收垂直边距，缓和实心色的视觉膨胀 */
  margin: 0.05rem 0;
}

@media (max-width: 640px) {
  .row {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <div>
    <h1 class="page-title">打字练习</h1>
    <p class="page-desc">选择文本与模式后，点击练习区开始输入。打错会标红，可用退格修正。</p>

    <p v-if="loadError" class="error-text">{{ loadError }}</p>

    <div class="toolbar panel">
      <div class="field">
        <label for="textSel">练习文本</label>
        <select id="textSel" v-model="selectedId" :disabled="running">
          <option v-for="t in texts" :key="t.id" :value="t.id">{{ t.title }}</option>
        </select>
      </div>
      <div class="field">
        <label for="modeSel">模式</label>
        <select id="modeSel" v-model="mode" :disabled="running">
          <option value="free">自由练完</option>
          <option value="timed-1">限时 1 分钟</option>
          <option value="timed-3">限时 3 分钟</option>
          <option value="timed-5">限时 5 分钟</option>
        </select>
      </div>
    </div>

    <template v-if="current">
      <MetricsBar :metrics="metrics" />
      <TypingArea
        ref="areaRef"
        :text="current.content"
        :statuses="statuses"
        :caret-index="caretIndex"
        :started="started"
        :finished="finished"
        @keydown="handleKeyDown"
      />
      <ResultsCard
        v-if="finished"
        :text-title="current.title"
        :mode="mode"
        :metrics="metrics"
        @retry="onRetry"
        @change="onChange"
      />
    </template>
    <p v-else class="muted">词库为空，请先到「词库」添加文本。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as api from '../api/client'
import MetricsBar from '../components/MetricsBar.vue'
import ResultsCard from '../components/ResultsCard.vue'
import TypingArea from '../components/TypingArea.vue'
import { useTypingEngine, type TypingMetrics } from '../composables/useTypingEngine'
import type { PracticeMode, PracticeText } from '../types'

const router = useRouter()
const texts = ref<PracticeText[]>([])
const selectedId = ref('')
const mode = ref<PracticeMode>('free')
const loadError = ref('')
const areaRef = ref<{ focusSelf: () => void } | null>(null)
const saved = ref(false)

const current = computed(() => texts.value.find((t) => t.id === selectedId.value))
const textRef = computed(() => current.value?.content || '')
const active = ref(true)

const {
  statuses,
  caretIndex,
  started,
  finished,
  metrics,
  handleKeyDown,
  reset,
} = useTypingEngine({
  text: textRef,
  mode,
  active,
  onFinish: onEngineFinish,
})

const running = computed(() => started.value && !finished.value)

async function load() {
  loadError.value = ''
  try {
    texts.value = await api.listTexts()
    if (!selectedId.value && texts.value[0]) selectedId.value = texts.value[0].id
    const settings = await api.getSettings()
    if (!started.value) mode.value = settings.defaultMode || 'free'
  } catch (e) {
    loadError.value =
      e instanceof Error
        ? `${e.message}（请确认已运行 npm run dev，本机文件服务需启动）`
        : '加载失败'
  }
}

async function onEngineFinish(m: TypingMetrics) {
  if (saved.value || !current.value) return
  saved.value = true
  try {
    await api.saveResult({
      textId: current.value.id,
      textTitle: current.value.title,
      wpm: m.wpm,
      accuracy: m.accuracy,
      correctChars: m.correctChars,
      totalChars: m.totalAttempted,
      errorCount: m.errorCount,
      durationMs: m.elapsedMs,
      mode: mode.value,
    })
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '保存成绩失败'
  }
}

function onRetry() {
  saved.value = false
  reset()
  areaRef.value?.focusSelf()
}

function onChange() {
  router.push('/library')
}

watch(selectedId, () => {
  saved.value = false
})

onMounted(load)
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.toolbar .field {
  margin-bottom: 0;
}

@media (max-width: 640px) {
  .toolbar {
    grid-template-columns: 1fr;
  }
}
</style>

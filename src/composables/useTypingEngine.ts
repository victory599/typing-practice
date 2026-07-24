import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { CharStatus, PracticeMode } from '../types'
import { TIMED_MODE_SECONDS } from '../types'
import { calcAccuracy, calcWpm } from '../lib/metrics'

export interface TypingMetrics {
  wpm: number
  accuracy: number
  correctChars: number
  totalAttempted: number
  errorCount: number
  elapsedMs: number
  remainingMs: number | null
  progress: number
}

type StringRef = Ref<string> | { readonly value: string }
type ModeRef = Ref<PracticeMode> | { readonly value: PracticeMode }
type BoolRef = Ref<boolean> | { readonly value: boolean }

/**
 * 字符级打字引擎：
 * - 打错可继续前进并标红（可退格修正）
 * - 忽略修饰键与输入法 composition（本版不做中文 IME 整词）
 */
export function useTypingEngine(options: {
  text: StringRef
  mode: ModeRef
  active: BoolRef
  onFinish?: (metrics: TypingMetrics) => void
}) {
  const statuses = ref<CharStatus[]>([])
  const caretIndex = ref(0)
  const started = ref(false)
  const finished = ref(false)
  const elapsedMs = ref(0)
  const tick = ref(0)

  let startTime: number | null = null
  let finishCalled = false

  function emptyStatuses(len: number): CharStatus[] {
    return Array.from({ length: len }, () => 'pending')
  }

  function reset() {
    statuses.value = emptyStatuses(options.text.value.length)
    caretIndex.value = 0
    started.value = false
    finished.value = false
    elapsedMs.value = 0
    tick.value = 0
    startTime = null
    finishCalled = false
  }

  watch(
    () => [options.text.value, options.mode.value],
    () => reset(),
    { immediate: true },
  )

  // 运行中每 100ms 刷新一次用时，便于实时 WPM
  let timer: number | undefined
  watch(
    () => [started.value, finished.value, options.active.value],
    () => {
      if (timer) {
        window.clearInterval(timer)
        timer = undefined
      }
      if (started.value && !finished.value && options.active.value) {
        timer = window.setInterval(() => {
          tick.value += 1
        }, 100)
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (timer) window.clearInterval(timer)
  })

  const timedLimitMs = computed(() => {
    const m = options.mode.value
    return m === 'free' ? null : TIMED_MODE_SECONDS[m] * 1000
  })

  const metrics = computed<TypingMetrics>(() => {
    // 依赖 tick，驱动计算刷新
    void tick.value
    const now = startTime ? Date.now() - startTime : 0
    const limit = timedLimitMs.value
    const elapsed = finished.value
      ? elapsedMs.value
      : limit != null
        ? Math.min(now, limit)
        : now

    let correct = 0
    let attempted = 0
    let errors = 0
    for (const s of statuses.value) {
      if (s === 'pending') continue
      attempted += 1
      if (s === 'correct') correct += 1
      else errors += 1
    }

    const progress =
      options.text.value.length === 0
        ? 0
        : Math.min(100, Math.round((caretIndex.value / options.text.value.length) * 100))

    return {
      wpm: calcWpm(correct, Math.max(elapsed, 1)),
      accuracy: calcAccuracy(correct, attempted),
      correctChars: correct,
      totalAttempted: attempted,
      errorCount: errors,
      elapsedMs: elapsed,
      remainingMs: limit == null ? null : Math.max(0, limit - elapsed),
      progress,
    }
  })

  function finish() {
    if (finished.value) return
    finished.value = true
    if (startTime) elapsedMs.value = Date.now() - startTime
    if (timedLimitMs.value != null) {
      elapsedMs.value = Math.min(elapsedMs.value, timedLimitMs.value)
    }
    if (!finishCalled) {
      finishCalled = true
      options.onFinish?.(metrics.value)
    }
  }

  // 限时到点自动结束
  watch(
    () => metrics.value.remainingMs,
    (remaining) => {
      if (
        started.value &&
        !finished.value &&
        remaining != null &&
        remaining <= 0
      ) {
        finish()
      }
    },
  )

  function handleKeyDown(e: KeyboardEvent) {
    if (!options.active.value || finished.value) return
    if (e.isComposing) return

    const key = e.key
    if (key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') return
    if (key === 'Tab' || key === 'Escape') {
      e.preventDefault()
      return
    }

    // 开始计时：第一次有效输入（含 Enter 换行）
    if (!started.value) {
      if (key === 'Backspace') return
      started.value = true
      startTime = Date.now()
    }

    if (key === 'Backspace') {
      e.preventDefault()
      if (caretIndex.value <= 0) return
      const next = [...statuses.value]
      const i = caretIndex.value - 1
      next[i] = 'pending'
      statuses.value = next
      caretIndex.value = i
      return
    }

    // Enter 对应文本中的 \n；其余只接受长度为 1 的可打印字符
    const typed = key === 'Enter' ? '\n' : key.length === 1 ? key : null
    if (typed == null) return
    e.preventDefault()

    const i = caretIndex.value
    if (i >= options.text.value.length) return

    const expected = options.text.value[i]
    const next = [...statuses.value]
    next[i] = typed === expected ? 'correct' : 'incorrect'
    statuses.value = next
    caretIndex.value = i + 1

    if (caretIndex.value >= options.text.value.length) {
      finish()
    }
  }

  return {
    statuses,
    caretIndex,
    started,
    finished,
    metrics,
    handleKeyDown,
    reset,
    finish,
  }
}

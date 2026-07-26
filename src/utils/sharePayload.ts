import type {
  PracticeMode,
  RunResult,
  ShareSinglePayload,
  ShareStatsPayload,
} from '../types'

const MODE_LABELS: Record<PracticeMode, string> = {
  free: '自由',
  'timed-1': '1 分钟',
  'timed-3': '3 分钟',
  'timed-5': '5 分钟',
}

const MAX_RECENT = 20

export function modeLabel(mode: PracticeMode) {
  return MODE_LABELS[mode] || mode
}

export function shortTimeLabel(ts: number) {
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}/${dd} ${hh}:${mi}`
}

export function buildSinglePayload(r: RunResult): ShareSinglePayload {
  return {
    textTitle: r.textTitle,
    mode: r.mode,
    wpm: r.wpm,
    accuracy: r.accuracy,
    durationMs: r.durationMs,
    createdAt: r.createdAt,
    correctChars: r.correctChars,
    errorCount: r.errorCount,
  }
}

export function buildStatsPayload(
  list: RunResult[],
  filter: { mode: '' | PracticeMode; titleQuery: string },
): ShareStatsPayload {
  const count = list.length
  let sumWpm = 0
  let maxWpm = 0
  let sumAcc = 0
  const modeCounts: Partial<Record<PracticeMode, number>> = {}

  for (const r of list) {
    sumWpm += r.wpm
    sumAcc += r.accuracy
    if (r.wpm > maxWpm) maxWpm = r.wpm
    modeCounts[r.mode] = (modeCounts[r.mode] || 0) + 1
  }

  const recent = [...list]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_RECENT)
    .reverse()
    .map((r) => ({
      timeLabel: shortTimeLabel(r.createdAt),
      wpm: r.wpm,
      accuracy: r.accuracy,
    }))

  return {
    filter: {
      mode: filter.mode,
      modeLabel: filter.mode ? modeLabel(filter.mode) : '全部模式',
      titleQuery: filter.titleQuery,
    },
    summary: {
      count,
      avgWpm: count ? Math.round((sumWpm / count) * 10) / 10 : 0,
      maxWpm: Math.round(maxWpm * 10) / 10,
      avgAccuracy: count ? Math.round((sumAcc / count) * 10) / 10 : 0,
    },
    modeCounts,
    recent,
  }
}

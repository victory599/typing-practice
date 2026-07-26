/** 练习文本 */
export interface PracticeText {
  id: string
  title: string
  content: string
  updatedAt: number
  isSample?: boolean
}

/**
 * 评分约定（实时与结算保持一致）：
 * - WPM = (correctChars / 5) / minutes
 * - accuracy = correctChars / totalAttemptedChars
 */
export interface RunResult {
  id: string
  textId: string
  textTitle: string
  wpm: number
  accuracy: number
  correctChars: number
  totalChars: number
  errorCount: number
  durationMs: number
  mode: PracticeMode
  createdAt: number
}

export type PracticeMode = 'free' | 'timed-1' | 'timed-3' | 'timed-5'

export type CharStatus = 'pending' | 'correct' | 'incorrect'

export const TIMED_MODE_SECONDS: Record<Exclude<PracticeMode, 'free'>, number> = {
  'timed-1': 60,
  'timed-3': 180,
  'timed-5': 300,
}

export interface AppSettings {
  dataPath: string
  defaultMode: PracticeMode
  theme: string
  configPath: string
  configPathFixed: boolean
  resolvedDataPath: string
  defaultDataPath: string
}

/** 单条成绩分享载荷 */
export interface ShareSinglePayload {
  textTitle: string
  mode: PracticeMode
  wpm: number
  accuracy: number
  durationMs: number
  createdAt: number
  correctChars?: number
  errorCount?: number
}

/** 筛选汇总 + 图表序列 */
export interface ShareStatsPayload {
  filter: {
    mode: '' | PracticeMode
    modeLabel: string
    titleQuery: string
  }
  summary: {
    count: number
    avgWpm: number
    maxWpm: number
    avgAccuracy: number
  }
  modeCounts: Partial<Record<PracticeMode, number>>
  recent: Array<{ timeLabel: string; wpm: number; accuracy: number }>
}

export type ShareKind = 'single' | 'stats'

export interface ShareRecord {
  id: string
  kind: ShareKind
  payload: ShareSinglePayload | ShareStatsPayload
  createdAt: number
  expiresAt: number
}

export interface CreateShareResponse {
  id: string
  urlPath: string
  expiresAt: number
}

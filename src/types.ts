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

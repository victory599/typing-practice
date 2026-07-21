/** 按约定计算 WPM：每 5 个正确字符算 1 词 */
export function calcWpm(correctChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0
  const minutes = elapsedMs / 60000
  return Math.round((correctChars / 5 / minutes) * 10) / 10
}

/** 准确率：正确字符 / 已尝试字符，返回 0–100 的整数百分比 */
export function calcAccuracy(correctChars: number, totalAttempted: number): number {
  if (totalAttempted <= 0) return 100
  return Math.round((correctChars / totalAttempted) * 100)
}

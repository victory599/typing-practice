import type {
  AppSettings,
  CreateShareResponse,
  PracticeText,
  RunResult,
  ShareKind,
  ShareRecord,
  ShareSinglePayload,
  ShareStatsPayload,
} from '../types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `请求失败 (${res.status})`)
  }
  return data as T
}

export function getSettings() {
  return request<AppSettings>('/api/settings')
}

export function updateSettings(body: { defaultMode?: string; theme?: string }) {
  return request('/api/settings', { method: 'PUT', body: JSON.stringify(body) })
}

export function migrateDataPath(path: string) {
  return request<AppSettings>('/api/settings/data-path', {
    method: 'POST',
    body: JSON.stringify({ path }),
  })
}

export function pickDirectory() {
  return request<{ cancelled: boolean; path: string | null }>(
    '/api/settings/pick-directory',
    { method: 'POST' },
  )
}

export function listTexts() {
  return request<PracticeText[]>('/api/texts')
}

export function createText(title: string, content: string) {
  return request<PracticeText>('/api/texts', {
    method: 'POST',
    body: JSON.stringify({ title, content }),
  })
}

export function updateText(id: string, title: string, content: string) {
  return request<PracticeText>(`/api/texts/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title, content }),
  })
}

export function deleteText(id: string) {
  return request<{ ok: boolean }>(`/api/texts/${id}`, { method: 'DELETE' })
}

export function deleteTexts(ids: string[]) {
  return request<{ ok: boolean; deleted: number }>('/api/texts/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

export function deleteAllTexts() {
  return request<{ ok: boolean; deleted: number }>('/api/texts/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ all: true }),
  })
}

export function listResults() {
  return request<RunResult[]>('/api/results')
}

export function saveResult(body: Omit<RunResult, 'id' | 'createdAt'>) {
  return request<RunResult>('/api/results', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function clearResults() {
  return request<{ ok: boolean }>('/api/results', { method: 'DELETE' })
}

export function createShare(
  kind: ShareKind,
  payload: ShareSinglePayload | ShareStatsPayload,
  sourceKey?: string,
) {
  return request<CreateShareResponse>('/api/shares', {
    method: 'POST',
    body: JSON.stringify({ kind, payload, sourceKey }),
  })
}

export function getShare(id: string) {
  return request<ShareRecord>(`/api/shares/${id}`)
}

export function getLanAddresses() {
  return request<{ lanAddresses: string[] }>('/api/network')
}

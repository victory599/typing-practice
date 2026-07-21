/**
 * 本机文件服务：只监听 127.0.0.1，读写应用根下的 config/ 与可迁移的 data/。
 * 关浏览器不会停止本进程，需在终端 Ctrl+C。
 */
import cors from 'cors'
import express from 'express'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.resolve(__dirname, '..')
const CONFIG_DIR = path.join(APP_ROOT, 'config')
const CONFIG_FILE = path.join(CONFIG_DIR, 'settings.json')
const DEFAULT_DATA_DIR = path.join(APP_ROOT, 'data')
const PORT = 8787

const DEFAULT_SETTINGS = {
  dataPath: '',
  defaultMode: 'free',
  theme: 'light',
}

/** 内置范文：仅在 texts.json 不存在或为空数组时写入 */
const SAMPLE_TEXTS = [
  {
    id: 'sample-pangram',
    title: '英文练习 · 全字母句',
    content:
      'The quick brown fox jumps over the lazy dog. Practice makes progress when you type with calm focus every day.',
    updatedAt: Date.now(),
    isSample: true,
  },
  {
    id: 'sample-code',
    title: '代码片段 · 简洁函数',
    content:
      'function add(a, b) {\n  return a + b;\n}\n\nconst total = add(3, 4);\nconsole.log(total);',
    updatedAt: Date.now(),
    isSample: true,
  },
  {
    id: 'sample-prose',
    title: '短文 · 专注',
    content:
      'Typing is a craft of small motions. Keep your wrists light, your eyes on the next word, and let accuracy lead speed.',
    updatedAt: Date.now(),
    isSample: true,
  },
]

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

/** 原子写入：先写临时文件再替换，降低半截文件风险 */
async function writeJsonAtomic(filePath, data) {
  await ensureDir(path.dirname(filePath))
  const tmp = `${filePath}.${process.pid}.tmp`
  const body = JSON.stringify(data, null, 2)
  await fs.writeFile(tmp, body, 'utf8')
  await fs.rename(tmp, filePath)
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    if (err && err.code === 'ENOENT') return fallback
    throw err
  }
}

async function loadSettings() {
  await ensureDir(CONFIG_DIR)
  const settings = await readJson(CONFIG_FILE, null)
  if (!settings) {
    await writeJsonAtomic(CONFIG_FILE, DEFAULT_SETTINGS)
    return { ...DEFAULT_SETTINGS }
  }
  return { ...DEFAULT_SETTINGS, ...settings }
}

async function saveSettings(settings) {
  await writeJsonAtomic(CONFIG_FILE, settings)
}

/** 解析当前数据目录：空字符串表示应用根下默认 data/ */
function resolveDataDir(settings) {
  const raw = (settings.dataPath || '').trim()
  if (!raw) return DEFAULT_DATA_DIR
  return path.isAbsolute(raw) ? raw : path.resolve(APP_ROOT, raw)
}

async function ensureDataFiles(dataDir) {
  await ensureDir(dataDir)
  const textsPath = path.join(dataDir, 'texts.json')
  const resultsPath = path.join(dataDir, 'results.json')

  // 仅在文件不存在时写入范文；已存在的空数组表示用户清空过，不再自动灌回
  let texts = await readJson(textsPath, null)
  if (texts === null) {
    texts = SAMPLE_TEXTS
    await writeJsonAtomic(textsPath, texts)
  } else if (!Array.isArray(texts)) {
    await writeJsonAtomic(textsPath, [])
  }

  const results = await readJson(resultsPath, null)
  if (!results || !Array.isArray(results)) {
    await writeJsonAtomic(resultsPath, [])
  }
}

/** 跨磁盘时 rename 可能失败，则写入目标后再删源文件（效果仍是迁走） */
async function moveFile(src, dest) {
  await ensureDir(path.dirname(dest))
  try {
    await fs.rename(src, dest)
  } catch {
    const data = await fs.readFile(src)
    await fs.writeFile(dest, data)
    await fs.unlink(src)
  }
}

async function migrateDataDir(oldDir, newDir) {
  if (path.resolve(oldDir) === path.resolve(newDir)) {
    return { moved: false, reason: 'same-path' }
  }
  await ensureDir(newDir)
  for (const name of ['texts.json', 'results.json']) {
    const src = path.join(oldDir, name)
    const dest = path.join(newDir, name)
    try {
      await fs.access(src)
    } catch {
      continue
    }
    // 若目标已有文件，先移走源侧即可覆盖目标（用户主动迁移）
    try {
      await fs.access(dest)
      await fs.unlink(dest)
    } catch {
      /* 目标不存在 */
    }
    await moveFile(src, dest)
  }
  // 尝试删除空的旧目录（失败可忽略）
  try {
    const left = await fs.readdir(oldDir)
    if (left.length === 0) await fs.rmdir(oldDir)
  } catch {
    /* ignore */
  }
  return { moved: true }
}

const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/settings', async (_req, res) => {
  try {
    const settings = await loadSettings()
    const dataDir = resolveDataDir(settings)
    await ensureDataFiles(dataDir)
    res.json({
      ...settings,
      configPath: CONFIG_DIR,
      configPathFixed: true,
      resolvedDataPath: dataDir,
      defaultDataPath: DEFAULT_DATA_DIR,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: String(err.message || err) })
  }
})

app.put('/api/settings', async (req, res) => {
  try {
    const current = await loadSettings()
    // 不允许通过本接口改路径；路径走专用迁移接口
    const next = {
      ...current,
      defaultMode: req.body.defaultMode ?? current.defaultMode,
      theme: req.body.theme ?? current.theme,
      dataPath: current.dataPath,
    }
    await saveSettings(next)
    res.json(next)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: String(err.message || err) })
  }
})

app.post('/api/settings/data-path', async (req, res) => {
  try {
    const requested = String(req.body.path ?? '').trim()
    const settings = await loadSettings()
    const oldDir = resolveDataDir(settings)
    // 空字符串表示恢复默认 data/
    const newDir = requested
      ? path.isAbsolute(requested)
        ? requested
        : path.resolve(APP_ROOT, requested)
      : DEFAULT_DATA_DIR

    await ensureDataFiles(oldDir)
    await migrateDataDir(oldDir, newDir)

    // 存相对路径更友好：若在应用根下则存相对，否则存绝对
    let storePath = ''
    if (path.resolve(newDir) === path.resolve(DEFAULT_DATA_DIR)) {
      storePath = ''
    } else {
      const rel = path.relative(APP_ROOT, newDir)
      storePath =
        rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : newDir
    }

    const next = { ...settings, dataPath: storePath }
    await saveSettings(next)
    await ensureDataFiles(newDir)

    res.json({
      ...next,
      configPath: CONFIG_DIR,
      configPathFixed: true,
      resolvedDataPath: newDir,
      defaultDataPath: DEFAULT_DATA_DIR,
      migrated: true,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: String(err.message || err) })
  }
})

app.get('/api/texts', async (_req, res) => {
  try {
    const settings = await loadSettings()
    const dataDir = resolveDataDir(settings)
    await ensureDataFiles(dataDir)
    const texts = await readJson(path.join(dataDir, 'texts.json'), [])
    texts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    res.json(texts)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: String(err.message || err) })
  }
})

app.post('/api/texts', async (req, res) => {
  try {
    const title = String(req.body.title || '').trim()
    const content = String(req.body.content || '')
    if (!title || !content) {
      res.status(400).json({ error: '标题与正文不能为空' })
      return
    }
    const settings = await loadSettings()
    const dataDir = resolveDataDir(settings)
    await ensureDataFiles(dataDir)
    const file = path.join(dataDir, 'texts.json')
    const texts = await readJson(file, [])
    const item = {
      id: crypto.randomUUID(),
      title,
      content,
      updatedAt: Date.now(),
      isSample: false,
    }
    texts.push(item)
    await writeJsonAtomic(file, texts)
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: String(err.message || err) })
  }
})

app.put('/api/texts/:id', async (req, res) => {
  try {
    const settings = await loadSettings()
    const dataDir = resolveDataDir(settings)
    const file = path.join(dataDir, 'texts.json')
    const texts = await readJson(file, [])
    const idx = texts.findIndex((t) => t.id === req.params.id)
    if (idx < 0) {
      res.status(404).json({ error: '未找到该文本' })
      return
    }
    const title = String(req.body.title ?? texts[idx].title).trim()
    const content = String(req.body.content ?? texts[idx].content)
    if (!title || !content) {
      res.status(400).json({ error: '标题与正文不能为空' })
      return
    }
    texts[idx] = {
      ...texts[idx],
      title,
      content,
      updatedAt: Date.now(),
    }
    await writeJsonAtomic(file, texts)
    res.json(texts[idx])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: String(err.message || err) })
  }
})

app.post('/api/texts/bulk-delete', async (req, res) => {
  try {
    const settings = await loadSettings()
    const dataDir = resolveDataDir(settings)
    const file = path.join(dataDir, 'texts.json')
    const texts = await readJson(file, [])
    const all = req.body?.all === true
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : []

    let next = texts
    if (all) {
      next = []
    } else if (ids.length > 0) {
      const idSet = new Set(ids)
      next = texts.filter((t) => !idSet.has(t.id))
    } else {
      res.status(400).json({ error: '请提供要删除的 id 列表，或指定全部删除' })
      return
    }

    await writeJsonAtomic(file, next)
    res.json({ ok: true, deleted: texts.length - next.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: String(err.message || err) })
  }
})

app.delete('/api/texts/:id', async (req, res) => {
  try {
    const settings = await loadSettings()
    const dataDir = resolveDataDir(settings)
    const file = path.join(dataDir, 'texts.json')
    const texts = await readJson(file, [])
    const next = texts.filter((t) => t.id !== req.params.id)
    if (next.length === texts.length) {
      res.status(404).json({ error: '未找到该文本' })
      return
    }
    await writeJsonAtomic(file, next)
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: String(err.message || err) })
  }
})

app.get('/api/results', async (_req, res) => {
  try {
    const settings = await loadSettings()
    const dataDir = resolveDataDir(settings)
    await ensureDataFiles(dataDir)
    const results = await readJson(path.join(dataDir, 'results.json'), [])
    results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    res.json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: String(err.message || err) })
  }
})

app.post('/api/results', async (req, res) => {
  try {
    const settings = await loadSettings()
    const dataDir = resolveDataDir(settings)
    await ensureDataFiles(dataDir)
    const file = path.join(dataDir, 'results.json')
    const results = await readJson(file, [])
    const item = {
      id: crypto.randomUUID(),
      textId: req.body.textId,
      textTitle: req.body.textTitle,
      wpm: req.body.wpm,
      accuracy: req.body.accuracy,
      correctChars: req.body.correctChars,
      totalChars: req.body.totalChars,
      errorCount: req.body.errorCount,
      durationMs: req.body.durationMs,
      mode: req.body.mode,
      createdAt: Date.now(),
    }
    results.push(item)
    await writeJsonAtomic(file, results)
    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: String(err.message || err) })
  }
})

app.delete('/api/results', async (_req, res) => {
  try {
    const settings = await loadSettings()
    const dataDir = resolveDataDir(settings)
    await writeJsonAtomic(path.join(dataDir, 'results.json'), [])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: String(err.message || err) })
  }
})

// 生产模式可托管前端构建产物
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(APP_ROOT, 'dist')
  app.use(express.static(dist))
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'))
  })
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[typing-practice] 本机文件服务 http://127.0.0.1:${PORT}`)
  console.log(`[typing-practice] 配置目录（固定）: ${CONFIG_DIR}`)
  console.log(`[typing-practice] 默认数据目录: ${DEFAULT_DATA_DIR}`)
  console.log('[typing-practice] 关浏览器不会停止本服务，请在终端 Ctrl+C 结束')
}).on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(
      `[typing-practice] 端口 ${PORT} 已被占用。请先结束旧进程后重试，例如：\n` +
        `  lsof -i :${PORT}\n` +
        `  kill -9 <PID>`,
    )
  } else {
    console.error('[typing-practice] 启动失败:', err)
  }
  process.exit(1)
})

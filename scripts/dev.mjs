/**
 * 开发启动脚本：先起本机文件服务，再起 Vite，并同时打印两个访问地址。
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const API = 'http://127.0.0.1:8787'
const WEB = 'http://127.0.0.1:5173'

function logBanner() {
  console.log('')
  console.log('========================================')
  console.log('  本地打字练习已启动')
  console.log(`  浏览器访问: ${WEB}`)
  console.log(`  本机文件服务: ${API}`)
  console.log('  结束请按 Ctrl+C')
  console.log('========================================')
  console.log('')
}

function run(command, args, name) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
    shell: false,
  })

  const prefix = (stream) => {
    stream.on('data', (buf) => {
      const text = buf.toString()
      for (const line of text.split(/\r?\n/)) {
        if (line.length) console.log(`[${name}] ${line}`)
      }
    })
  }
  prefix(child.stdout)
  prefix(child.stderr)
  return child
}

async function waitForApi(timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${API}/api/health`)
      if (res.ok) return
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`等待本机文件服务超时：${API}（请检查 8787 端口是否被占用）`)
}

const children = []

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM')
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

const server = run(process.execPath, ['server/index.js'], 'server')
children.push(server)

server.on('exit', (code, signal) => {
  if (signal === 'SIGTERM' || signal === 'SIGINT') return
  console.error(`[server] 已退出 code=${code} signal=${signal}`)
  shutdown()
})

try {
  await waitForApi()
} catch (err) {
  console.error(String(err.message || err))
  shutdown()
}

logBanner()

const web = run(
  path.join(root, 'node_modules', '.bin', 'vite'),
  ['--host', '127.0.0.1', '--port', '5173', '--strictPort'],
  'web',
)
children.push(web)

web.on('exit', (code, signal) => {
  if (signal === 'SIGTERM' || signal === 'SIGINT') return
  console.error(`[web] 已退出 code=${code} signal=${signal}`)
  shutdown()
})

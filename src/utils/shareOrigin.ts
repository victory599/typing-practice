import * as api from '../api/client'

function isLoopbackHost(hostname: string) {
  return (
    hostname === '127.0.0.1' ||
    hostname === 'localhost' ||
    hostname === '[::1]' ||
    hostname === '::1'
  )
}

/**
 * 分享二维码用的 origin：本机用 127.0.0.1 打开时，换成局域网 IP，手机才能扫开。
 * 已用局域网 IP 打开时，直接用当前 origin。
 */
export async function getShareOrigin(): Promise<string> {
  const { protocol, hostname, port } = window.location
  if (!isLoopbackHost(hostname)) return window.location.origin

  try {
    const { lanAddresses } = await api.getLanAddresses()
    const ip = lanAddresses[0]
    if (!ip) return window.location.origin
    const host = port ? `${ip}:${port}` : ip
    return `${protocol}//${host}`
  } catch {
    return window.location.origin
  }
}

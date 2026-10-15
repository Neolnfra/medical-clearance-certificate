// 明检 MedClear · 生产静态服务器
// - 根路径 / 返回 index.html，永不显示目录列表
// - 前端路由（无扩展名路径）回退到 index.html
// - 端口由 PORT 指定（默认 4173），绑定 HOST（默认 0.0.0.0）
import http from 'node:http'
import { createReadStream, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'

const PORT = Number(process.env.PORT || 4173)
const HOST = process.env.HOST || '0.0.0.0'
const ROOT = resolve(process.cwd(), 'dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm'
}

function safeStat(p) {
  try { return statSync(p) } catch { return null }
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end('405 Method Not Allowed')
  }

  let pathname
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname) }
  catch { res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('400 Bad Request') }

  let filePath = normalize(join(ROOT, pathname))
  if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end('403 Forbidden')
  }

  let st = safeStat(filePath)
  if (st && st.isDirectory()) { filePath = join(filePath, 'index.html'); st = safeStat(filePath) }
  // 前端路由回退（如 /report、/about）：仅对无扩展名路径回退，避免把缺失资源当成页面
  if ((!st || !st.isFile()) && !extname(pathname)) {
    filePath = join(ROOT, 'index.html'); st = safeStat(filePath)
  }
  if (!st || !st.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end('404 Not Found')
  }

  const headers = {
    'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Content-Length': st.size
  }
  headers['Cache-Control'] = filePath.includes(`${sep}assets${sep}`)
    ? 'public, max-age=31536000, immutable'
    : 'no-cache'

  res.writeHead(200, headers)
  if (req.method === 'HEAD') return res.end()
  createReadStream(filePath).pipe(res)
})

server.listen(PORT, HOST, () => {
  console.log(`[medclear] MODE=${process.env.MODE || 'online'} serving ${ROOT} at http://${HOST}:${PORT}`)
})

function shutdown(sig) {
  console.log(`[medclear] received ${sig}, shutting down…`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 3000)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

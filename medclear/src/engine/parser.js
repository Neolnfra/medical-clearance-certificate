// 报告解析：把用户上传/粘贴的自由文本、CSV、JSON 解析为结构化指标
import { matchIndicator, stripIndicatorAlias } from '../data/catalog.js'
import { INDICATORS } from '../data/health.js'

function firstNumber(s) {
  const m = s.match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

export function parseText(text) {
  const items = {}
  const hitLines = []
  const lines = String(text).split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const code = matchIndicator(line)
    if (!code) continue
    const value = firstNumber(stripIndicatorAlias(line, code))
    if (value == null || Number.isNaN(value)) continue
    items[code] = value
    hitLines.push({ code, value, raw: line })
  }
  return { items, hits: hitLines }
}

export function parseCSV(text) {
  const items = {}
  const rows = String(text).split(/\r?\n/)
  for (const raw of rows) {
    const line = raw.trim()
    if (!line) continue
    const parts = line.split(/[,\t;]/).map(s => s.trim()).filter(Boolean)
    if (parts.length < 2) continue
    let code = null
    const key = parts[0]
    if (INDICATORS[key]) code = key
    else code = matchIndicator(key) || matchIndicator(line)
    if (!code) continue
    const value = firstNumber(parts.slice(1).join(' '))
    if (value == null || Number.isNaN(value)) continue
    items[code] = value
  }
  return { items, hits: [] }
}

export function parseJSON(text) {
  const data = JSON.parse(text)
  const items = {}
  const push = (code, value) => { if (INDICATORS[code] && typeof value === 'number') items[code] = value }
  if (Array.isArray(data)) {
    data.forEach(row => {
      if (typeof row !== 'object') return
      const code = row.code || row.code_name || (row.name ? matchIndicator(String(row.name)) : null)
      const value = Number(row.value ?? row.val ?? row.result)
      if (code && !Number.isNaN(value)) push(code, value)
    })
  } else if (data && typeof data === 'object') {
    if (data.items && typeof data.items === 'object') {
      Object.entries(data.items).forEach(([k, v]) => {
        const code = INDICATORS[k] ? k : matchIndicator(k)
        if (code) push(code, Number(v))
      })
    } else {
      Object.entries(data).forEach(([k, v]) => {
        const code = INDICATORS[k] ? k : matchIndicator(k)
        if (code) push(code, Number(v))
      })
    }
  }
  return { items, hits: [] }
}

export function parseReport(text, fileName = '') {
  const f = fileName.toLowerCase()
  if (f.endsWith('.json')) {
    try { return parseJSON(text) } catch (e) { return parseText(text) }
  }
  if (f.endsWith('.csv')) return parseCSV(text)
  return parseText(text)
}

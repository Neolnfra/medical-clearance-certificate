import { MEMBERS, REPORTS, HISTORY } from './health.js'

export const PALETTE = ['#2f6bff', '#e5484d', '#e0900b', '#7c5cff', '#0e9f8e', '#12b8a0', '#d946ef', '#0ea5e9', '#f97316', '#14b8a6']

export function seedMembers() {
  return MEMBERS.map((m, i) => ({ ...m, color: m.color || PALETTE[i % PALETTE.length] }))
}

// 生成初始报告：每位成员一份完整报告 + 由历年趋势数据生成的“历史报告”，使趋势图表基于真实存储的报告数据
export function seedReports() {
  const out = {}
  MEMBERS.forEach(m => {
    const list = []
    const full = REPORTS[m.id]
    const fullYear = Number(full.date.slice(0, 4))
    list.push({ id: full.id, date: full.date, org: full.org, type: full.type, items: { ...full.items }, partial: false, source: '内置样例' })

    const h = HISTORY[m.id] || {}
    const years = [...new Set(Object.values(h).flat().map(p => p.y))].sort()
    years.forEach(y => {
      if (y === fullYear) return
      const items = {}
      Object.entries(h).forEach(([code, series]) => { const p = series.find(s => s.y === y); if (p) items[code] = p.v })
      if (Object.keys(items).length) {
        list.push({ id: `H-${m.id}-${y}`, date: `${y}-12-01`, org: full.org, type: '历年体检（趋势数据）', items, partial: true, source: '内置样例' })
      }
    })
    out[m.id] = list.sort((a, b) => (a.date < b.date ? 1 : -1))
  })
  return out
}

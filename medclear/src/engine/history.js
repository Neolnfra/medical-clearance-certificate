// 从报告列表构建 指标 -> [{y,v}] 的年度序列（去重，保留每年最新一条）
export function buildHistory(reports) {
  const map = {}
  ;(reports || []).forEach(r => {
    const y = Number(String(r.date || '').slice(0, 4))
    if (!y) return
    Object.entries(r.items || {}).forEach(([code, v]) => {
      (map[code] = map[code] || []).push({ y, v })
    })
  })
  for (const arr of Object.values(map)) {
    arr.sort((a, b) => a.y - b.y)
    const seen = new Set()
    for (let i = arr.length - 1; i >= 0; i--) {
      if (seen.has(arr[i].y)) arr.splice(i, 1)
      else seen.add(arr[i].y)
    }
  }
  return map
}

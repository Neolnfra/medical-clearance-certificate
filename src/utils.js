// 共享展示常量与工具：消除各视图/引擎中的重复定义
export const LEVEL_CLASS = { good: 'ok', watch: 'blue', mid: 'warn', high: 'danger', crit: 'crit' }
export const LEVEL_COLOR = { good: '#17a673', watch: '#2f6bff', mid: '#e0900b', high: '#e5484d', crit: '#b42318' }
export const STATUS_CLASS = { normal: 'ok', low: 'blue', high: 'warn', crit: 'crit' }
export const STATUS_TEXT = { normal: '正常', low: '偏低', high: '偏高', crit: '危急' }
export const STATUS_RANK = { crit: 4, high: 3, low: 2, normal: 1 }

const RISK_THRESHOLDS = [
  [85, 'crit'],
  [65, 'high'],
  [40, 'mid'],
  [20, 'watch']
]

export function riskKey(risk) {
  const hit = RISK_THRESHOLDS.find(([max]) => risk >= max)
  return hit ? hit[1] : 'good'
}

export function riskColor(risk) { return LEVEL_COLOR[riskKey(risk)] }
export function riskBg(risk) { return riskColor(risk) + '1a' }

export function pill(levelKey) { return 'pill ' + (LEVEL_CLASS[levelKey] || 'grey') }
export function statusPill(status) { return 'pill ' + (STATUS_CLASS[status] || 'grey') }

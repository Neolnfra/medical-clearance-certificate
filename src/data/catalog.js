// 指标目录与别名表：支撑“任意报告导入 + 人工确认”的核心
import { INDICATORS } from './health.js'

// 指标别名：用于从用户上传/粘贴的报告文本中识别指标。命中越长别名优先级越高。
export const ALIASES = {
  BMI: ['体质指数', '身体质量指数', 'bmi'],
  BP_H: ['收缩压', '高压', 'sbp'],
  WBC: ['白细胞计数', '白细胞', 'wbc'],
  RBC: ['红细胞计数', '红细胞', 'rbc'],
  HGB: ['血红蛋白', 'hgb', 'hb'],
  PLT: ['血小板计数', '血小板', 'plt'],
  ALT: ['丙氨酸氨基转移酶', '谷丙转氨酶', 'alt', 'sgpt', 'gpt'],
  AST: ['天门冬氨酸氨基转移酶', '谷草转氨酶', 'ast', 'sgot', 'got'],
  GGT: ['γ-谷氨酰转肽酶', '谷氨酰转肽酶', 'γ-gt', 'γgt', 'ggt', 'ggtp'],
  TBIL: ['总胆红素', 'tbil', 'stb'],
  ALB: ['白蛋白', 'alb'],
  Cr: ['血肌酐', '肌酐', 'crea', 'scr', 'cr'],
  BUN: ['尿素氮', '尿素', 'bun'],
  UA: ['血尿酸', '尿酸', 'ua'],
  TC: ['总胆固醇', '胆固醇', 'tc', 'chol'],
  TG: ['甘油三酯', '三酰甘油', 'tg'],
  LDL: ['低密度脂蛋白胆固醇', '低密度脂蛋白', 'ldl-c', 'ldlc', 'ldl'],
  HDL: ['高密度脂蛋白胆固醇', '高密度脂蛋白', 'hdl-c', 'hdlc', 'hdl'],
  GLP: ['空腹血糖', '葡萄糖', '血糖', 'glu', 'glucose', 'fbg'],
  HBA1C: ['糖化血红蛋白', 'hba1c', 'ghb'],
  TSH: ['促甲状腺激素', 'tsh'],
  FT3: ['游离三碘甲状腺原氨酸', '游离t3', 'ft3'],
  FT4: ['游离甲状腺素', '游离t4', 'ft4']
}

// 目录条目（用于手动录入、搜索）
export const CATALOG = Object.entries(INDICATORS).map(([code, meta]) => ({
  code,
  name: meta.name,
  en: meta.en,
  unit: meta.unit,
  cat: meta.cat,
  sys: meta.sys,
  ref: meta.ref,
  aliases: ALIASES[code] || []
}))

const ASCII_RE = /[a-z0-9-]/
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// 预编译别名索引：按别名长度降序（稳定排序），命中即最长别名，避免每次解析重复构造正则
const ALIAS_INDEX = []
const STRIP_RE = new Map()
for (const [code, aliases] of Object.entries(ALIASES)) {
  for (const raw of aliases) {
    const alias = raw.toLowerCase()
    const isAscii = /[a-z]/i.test(raw) && ASCII_RE.test(alias)
    const re = isAscii ? new RegExp('(^|[^a-z0-9])' + escapeRe(alias) + '([^a-z0-9]|$)', 'i') : null
    ALIAS_INDEX.push({ code, alias, len: alias.length, re })
  }
}
ALIAS_INDEX.sort((a, b) => b.len - a.len)

// 在文本中查找指标编码：返回命中长度最长的别名对应编码
export function matchIndicator(line) {
  const low = line.toLowerCase()
  for (const e of ALIAS_INDEX) {
    const hit = e.re ? e.re.test(low) : low.includes(e.alias)
    if (hit) return e.code
  }
  return null
}

// 从文本中移除某指标的所有别名，便于提取检测值
export function stripIndicatorAlias(line, code) {
  let out = line
  for (const raw of ALIASES[code] || []) {
    let re = STRIP_RE.get(raw)
    if (!re) { re = new RegExp(escapeRe(raw), 'ig'); STRIP_RE.set(raw, re) }
    out = out.replace(re, ' ')
  }
  return out
}

export function catalogByCode(code) { return CATALOG.find(c => c.code === code) }
export function isKnownCode(code) { return !!INDICATORS[code] }

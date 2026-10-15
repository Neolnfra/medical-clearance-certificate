// 明检 MedClear —— 智能分析引擎
// 感知（Perceive）→ 推理（Reason）→ 决策（Decide）三段式，对应赛题对 AI 能力的要求。
import { INDICATORS, SYSTEMS, CRITICAL } from '../data/health.js'
import { LEVEL_COLOR, STATUS_RANK } from '../utils.js'

const SEX_REF = {
  RBC: { 男: [4.3, 5.8], 女: [3.8, 5.1] },
  HGB: { 男: [130, 175], 女: [115, 150] },
  ALT: { 男: [9, 50], 女: [7, 40] },
  AST: { 男: [15, 40], 女: [13, 35] },
  GGT: { 男: [10, 60], 女: [7, 45] },
  Cr: { 男: [57, 97], 女: [41, 73] },
  UA: { 男: [208, 428], 女: [155, 357] }
}

const LEVELS = [
  { max: 20, key: 'good', label: '良好', color: LEVEL_COLOR.good },
  { max: 40, key: 'watch', label: '需关注', color: LEVEL_COLOR.watch },
  { max: 65, key: 'mid', label: '中风险', color: LEVEL_COLOR.mid },
  { max: 85, key: 'high', label: '高风险', color: LEVEL_COLOR.high },
  { max: 999, key: 'crit', label: '极高风险', color: LEVEL_COLOR.crit }
]

const DEPT = { cardio: '心血管内科', liver: '消化内科 / 肝病科', kidney: '肾内科', metabolic: '内分泌科', blood: '血液内科', endocrine: '内分泌科' }
const FOLLOW = {
  cardio: '完善血脂四项、颈动脉超声与心电图，请心血管内科进行心血管风险分层',
  liver: '复查肝功能 + 肝胆腹部超声，必要时加做肝纤维化无创评估',
  kidney: '复查肾功能并计算 eGFR，加做尿常规与肾脏超声',
  metabolic: '请内分泌科评估，必要时行口服葡萄糖耐量试验（OGTT）',
  blood: '查贫血三项（铁 / 叶酸 / 维生素B12）与网织红细胞',
  endocrine: '复查甲功三项 + 甲状腺超声，评估是否需要干预'
}

export function refOf(code, sex) {
  const s = SEX_REF[code]
  if (s && s[sex]) return s[sex]
  return INDICATORS[code].ref
}

export function statusOf(code, value, sex) {
  const [lo, hi] = refOf(code, sex)
  const c = CRITICAL[code] || {}
  if (c.high != null && value >= c.high) return 'crit'
  if (c.low != null && value <= c.low) return 'crit'
  if (value > hi) return 'high'
  if (value < lo) return 'low'
  return 'normal'
}

function burdenOf(code, value, sex) {
  const [lo, hi] = refOf(code, sex)
  const w = INDICATORS[code].weight || 1
  let d = 0
  if (value > hi) d = (value - hi) / Math.max(hi - lo, 1e-6)
  else if (value < lo) d = (lo - value) / Math.max(hi - lo, 1e-6)
  return d * w
}

function riskFromBurden(b) { return Math.min(100, Math.round(100 * (1 - Math.exp(-b)))) }
function levelOf(risk) { return LEVELS.find(l => risk < l.max) }

export function analyze(report, member, history = {}) {
  const sex = member.sex
  const items = Object.entries(report.items).map(([code, value]) => {
    const meta = INDICATORS[code]
    const status = statusOf(code, value, sex)
    const bound = status === 'low' ? 'low' : 'high'
    return {
      code, value, status,
      name: meta.name, en: meta.en, unit: meta.unit, cat: meta.cat, sys: meta.sys,
      ref: refOf(code, sex),
      meaning: meta.meaning,
      deviation: meta[bound] || '',
      advice: meta[bound === 'low' ? 'adviceLow' : 'adviceHigh'] || '',
      burden: burdenOf(code, value, sex)
    }
  })

  const itemByCode = {}
  for (const i of items) itemByCode[i.code] = i

  const abnormal = items.filter(i => i.status !== 'normal')
    .sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || b.burden - a.burden)

  const burdenBySys = {}
  for (const i of items) burdenBySys[i.sys] = (burdenBySys[i.sys] || 0) + i.burden
  const systems = SYSTEMS.map(s => {
    const risk = riskFromBurden(burdenBySys[s.key] || 0)
    return { ...s, risk, level: levelOf(risk) }
  })

  const maxRisk = Math.max(...systems.map(s => s.risk))
  const avgRisk = systems.reduce((s, x) => s + x.risk, 0) / systems.length
  const overallRisk = Math.min(100, Math.round(0.55 * maxRisk + 0.45 * avgRisk))
  const overallLevel = levelOf(overallRisk)
  const healthScore = Math.max(0, 100 - overallRisk)

  // 推理链：多指标交叉推理，体现“推理”能力
  const reasoning = buildReasoning(report, member, itemByCode, abnormal)

  // 决策：复查计划、生活方式、就医科室、危急提醒
  const criticalAlerts = items.filter(i => i.status === 'crit')
  const followUp = []
  const seenFollow = new Set()
  systems.filter(s => s.risk >= 40).sort((a, b) => b.risk - a.risk).forEach(s => {
    if (!seenFollow.has(s.key)) { seenFollow.add(s.key); followUp.push(FOLLOW[s.key]) }
  })
  criticalAlerts.forEach(i => {
    const t = `【危急值】${i.name}（${i.value}${i.unit}）请尽快到${DEPT[i.sys]}就诊复核`
    if (!followUp.includes(t)) followUp.unshift(t)
  })
  if (!followUp.length) followUp.push('各项指标良好，建议保持年度常规体检节奏')

  const lifestyle = []
  const seenLifestyle = new Set()
  abnormal.forEach(i => { if (i.advice && !seenLifestyle.has(i.advice)) { seenLifestyle.add(i.advice); lifestyle.push(i.advice) } })
  if (!lifestyle.length) lifestyle.push('保持规律作息、均衡饮食与每周 150 分钟运动')

  const topSystem = [...systems].sort((a, b) => b.risk - a.risk)[0]
  const department = overallRisk >= 40 ? DEPT[topSystem.key] : ''

  const insights = buildInsights(history, sex)
  const summary = buildSummary(member, overallRisk, overallLevel, abnormal, systems)

  return {
    items, itemByCode, abnormal, systems, reasoning, followUp, lifestyle, department,
    insights, criticalAlerts, overallRisk, overallLevel, healthScore, summary,
    abnormalCount: abnormal.length,
    systemCount: systems.filter(s => s.risk >= 40).length
  }
}

// 趋势洞察（仅统计同一指标存在 2 个及以上数据点的序列）
function buildInsights(history, sex) {
  return Object.entries(history)
    .filter(([, series]) => series.length >= 2)
    .map(([code, series]) => {
      const first = series[0], last = series[series.length - 1]
      const delta = last.v - first.v
      const pct = Math.round((delta / first.v) * 100)
      const up = delta > 0
      const meta = INDICATORS[code]
      const bad = statusOf(code, last.v, sex) !== 'normal'
      return {
        code, name: meta.name, unit: meta.unit, series,
        change: delta, pct, up, bad,
        text: `${meta.name} 由 ${first.y} 年 ${first.v}${meta.unit} 变化至 ${last.y} 年 ${last.v}${meta.unit}，${up ? '上升' : '下降'} ${Math.abs(pct)}%`
          + (bad && up ? `，已超出参考区间，趋势需要警惕` : bad ? `，仍偏离参考区间` : `，处于正常范围`)
      }
    }).sort((a, b) => (b.bad - a.bad) || Math.abs(b.pct) - Math.abs(a.pct))
}

function buildReasoning(report, member, itemByCode, abnormal) {
  const isAb = (code) => { const i = itemByCode[code]; return !!i && i.status !== 'normal' }
  const v = (code) => report.items[code]
  const out = []

  // 代谢综合征 / 心血管代谢
  const msG = [isAb('BMI'), isAb('BP_H'), isAb('GLP'), isAb('TG'), isAb('HDL')].filter(Boolean).length
  if (msG >= 2) {
    out.push({
      level: msG >= 4 ? 'high' : 'mid',
      title: '心血管代谢综合征风险',
      chain: [
        isAb('BMI') ? `BMI ${v('BMI')} 超重` : null,
        isAb('BP_H') ? `收缩压 ${v('BP_H')} 偏高` : null,
        isAb('GLP') ? `空腹血糖 ${v('GLP')} 升高` : null,
        isAb('TG') ? `甘油三酯 ${v('TG')} 升高` : null,
        isAb('HDL') ? `高密度脂蛋白 ${v('HDL')} 偏低` : null
      ].filter(Boolean),
      conclusion: `同时命中 ${msG} 项代谢综合征组分，心脑血管事件风险显著上升，建议尽快进行心血管风险分层并启动生活方式干预。`
    })
  }

  // 肝胆推理
  if (isAb('ALT') || isAb('AST') || isAb('GGT')) {
    const chain = []
    if (isAb('ALT')) chain.push(`谷丙转氨酶 ALT ${v('ALT')} U/L 升高`)
    if (isAb('AST')) chain.push(`谷草转氨酶 AST ${v('AST')} U/L 升高`)
    if (isAb('GGT')) chain.push(`γ-谷氨酰转肽酶 GGT ${v('GGT')} U/L 升高`)
    const ggtHigh = isAb('GGT') && v('GGT') > 90
    out.push({
      level: ggtHigh ? 'high' : 'mid',
      title: '肝胆系统负担',
      chain,
      conclusion: ggtHigh
        ? 'GGT 显著升高且伴转氨酶异常，高度提示酒精性或脂肪性肝损伤，建议严格戒酒并完善肝胆超声。'
        : '转氨酶异常提示存在肝细胞损伤，需结合饮酒、用药与体重因素，复查肝功能并做肝胆超声。'
    })
  }

  // 贫血推理
  if (isAb('HGB') || isAb('RBC')) {
    const chain = []
    if (isAb('HGB')) chain.push(`血红蛋白 HGB ${v('HGB')} g/L 偏低`)
    if (isAb('RBC')) chain.push(`红细胞计数 RBC ${v('RBC')} ×10¹²/L 偏低`)
    if (isAb('Cr') && member.age >= 60) chain.push(`肌酐 Cr ${v('Cr')} μmol/L 升高（高龄）`)
    out.push({
      level: (v('HGB') < 110 ? 'mid' : 'watch'),
      title: isAb('Cr') && member.age >= 60 ? '贫血合并肾功能减退' : '贫血倾向',
      chain,
      conclusion: isAb('Cr') && member.age >= 60
        ? '高龄伴肌酐升高与血红蛋白下降，需警惕肾性贫血，建议评估 eGFR 并查贫血三项。'
        : '血红蛋白下降提示贫血，可能由营养缺乏或慢性失血导致，建议查贫血三项明确病因。'
    })
  }

  // 甲状腺推理
  if (isAb('TSH') && v('TSH') > 4.2) {
    const ftNormal = !isAb('FT3') && !isAb('FT4')
    out.push({
      level: v('TSH') > 10 ? 'high' : 'mid',
      title: ftNormal ? '亚临床甲状腺功能减退' : '甲状腺功能减退',
      chain: [`促甲状腺激素 TSH ${v('TSH')} mIU/L 升高`, ftNormal ? 'FT3 / FT4 尚在正常范围' : 'FT3 / FT4 亦异常'],
      conclusion: ftNormal
        ? 'TSH 升高而甲状腺激素正常，符合亚临床甲减，建议复查并评估是否需补充甲状腺素。'
        : '甲状腺激素水平异常，建议内分泌科进一步评估与治疗。'
    })
  }

  // 高尿酸 / 痛风
  if (isAb('UA') && v('UA') > 420) {
    out.push({
      level: v('UA') > 480 ? 'mid' : 'watch',
      title: '高尿酸血症风险',
      chain: [`血尿酸 UA ${v('UA')} μmol/L 偏高`],
      conclusion: '尿酸持续升高会增加痛风与尿路结石风险，建议限高嘌呤饮食、多饮水并监测尿酸。'
    })
  }

  // 血脂
  const lipids = [isAb('LDL'), isAb('TC'), isAb('TG')].filter(Boolean).length
  if (lipids >= 2 && !out.find(o => o.title.includes('代谢综合征'))) {
    out.push({
      level: v('LDL') > 4.1 ? 'high' : 'mid',
      title: '血脂异常',
      chain: [
        isAb('LDL') ? `低密度脂蛋白 LDL-C ${v('LDL')} mmol/L 升高` : null,
        isAb('TC') ? `总胆固醇 TC ${v('TC')} mmol/L 升高` : null,
        isAb('TG') ? `甘油三酯 TG ${v('TG')} mmol/L 升高` : null
      ].filter(Boolean),
      conclusion: '多项血脂指标异常，动脉粥样硬化风险上升，建议低脂饮食、规律运动并按需调脂治疗。'
    })
  }

  if (!out.length) {
    out.push({ level: 'good', title: '综合状态良好', chain: ['各项主要指标处于参考区间内'], conclusion: '本次报告未见明显异常，建议保持健康生活方式并坚持每年体检。' })
  }
  return out.sort((a, b) => ({ high: 0, mid: 1, watch: 2, good: 3 })[a.level] - ({ high: 0, mid: 1, watch: 2, good: 3 })[b.level])
}

function buildSummary(member, risk, level, abnormal, systems) {
  const top = [...systems].sort((a, b) => b.risk - a.risk).filter(s => s.risk >= 20).slice(0, 3)
  const focus = top.length ? `重点关注系统：${top.map(s => `${s.name}（${s.level.label}）`).join('、')}` : '各系统状态良好'
  return `${member.name}（${member.sex}·${member.age}岁）本次体检综合风险指数为 ${risk}/100，属于「${level.label}」，共检出 ${abnormal.length} 项异常指标。${focus}。`
}

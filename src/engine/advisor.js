// 本地规则建议引擎（未启用大模型时使用）
// 目标：从"逐条念指标"升级为"个体化、可量化、按优先级排序"的行动建议。
import { matchIndicator } from '../data/catalog.js'
import { STATUS_TEXT } from '../utils.js'

const SYS_KEYWORDS = {
  liver: ['肝', '转氨酶', '胆红素', '谷丙', '谷草', 'ggt', '胆'],
  kidney: ['肾', '肌酐', '尿素', '尿酸', '痛风'],
  cardio: ['心', '血管', '血脂', '胆固醇', '甘油三酯', '血压', '低密度', '高密度', 'ldl', 'hdl'],
  metabolic: ['血糖', '糖', '代谢', '体重', '肥胖', 'bmi', '糖化'],
  blood: ['血常规', '贫血', '血红蛋白', '红细胞', '白细胞', '血小板'],
  endocrine: ['甲状腺', 'tsh', '内分泌', '甲减', '甲亢']
}

// 个体化控制目标
const TARGET = {
  LDL: a => (a.overallRisk >= 65 ? '低密度脂蛋白建议控制在 1.8~2.6 mmol/L（心脑血管高危）' : '低密度脂蛋白建议控制在 3.4 mmol/L 以下'),
  TC: () => '总胆固醇建议控制在 5.2 mmol/L 以下',
  TG: () => '甘油三酯建议控制在 1.7 mmol/L 以下',
  HDL: () => '高密度脂蛋白建议提升到 1.0 mmol/L 以上',
  GLP: m => (m.age >= 45 ? '空腹血糖建议控制在 4.4~6.1 mmol/L，45 岁以上建议每年复查' : '空腹血糖建议控制在 4.4~6.1 mmol/L'),
  HBA1C: () => '糖化血红蛋白建议控制在 6.5% 以下',
  BP_H: () => '血压建议控制在 140/90 mmHg 以下（合并糖尿病或肾病建议 130/80 以下）',
  ALT: () => '谷丙转氨酶建议恢复至参考区间（< 50 U/L）',
  AST: () => '谷草转氨酶建议恢复至参考区间（< 40 U/L）',
  GGT: () => 'γ-谷氨酰转肽酶建议恢复至参考区间（< 60 U/L）',
  UA: () => '血尿酸建议控制在 420 μmol/L 以下（有痛风史建议 360 以下）',
  BMI: () => '建议 6 个月内减重 5%~10%，BMI 目标 < 24',
  HGB: m => `血红蛋白建议回升至 ${m.sex === '女' ? '115' : '130'} g/L 以上`,
  RBC: m => `红细胞建议回升至 ${m.sex === '女' ? '3.8' : '4.3'} ×10¹²/L 以上`,
  Cr: () => '肌酐建议保持稳定并评估 eGFR，避免使用肾损伤药物',
  BUN: () => '尿素氮建议恢复至参考区间（3.1~8.0 mmol/L）',
  TSH: () => '促甲状腺激素建议控制在 0.27~4.2 mIU/L',
  TBIL: () => '总胆红素建议恢复至参考区间（3.4~20.5 μmol/L）',
  ALB: () => '白蛋白建议回升至 40 g/L 以上，加强优质蛋白摄入',
  WBC: () => '白细胞建议恢复至参考区间（3.5~9.5 ×10⁹/L）'
}

function target(code, member, analysis) {
  const t = TARGET[code]
  return t ? t(member, analysis) : ''
}

// 个人风险因素提示
function personalNotes(member, analysis) {
  const notes = []
  const p = (member.profile || []).join(' ')
  if (/高血压/.test(p)) notes.push('已有高血压病史：本次血压变化需与既往用药方案结合评估，请勿自行调整降压药')
  if (/吸烟/.test(p)) notes.push('吸烟史会显著放大血脂与血压异常的心血管风险，建议尽早戒烟')
  if (/糖尿病/.test(p)) notes.push('糖尿病病史：血脂、血压控制目标应更严格，建议按内分泌科方案管理')
  if (/脂肪肝/.test(p)) notes.push('既往脂肪肝：转氨酶异常需优先排除脂肪性肝炎进展')
  if (member.age >= 60) notes.push('高龄人群：用药与复查需兼顾肝肾功能，建议由医生综合判断')
  return notes
}

// 生成按优先级排序的行动建议（默认机制的核心输出）
export function prioritizedAdvice(analysis, member) {
  if (!analysis) return { actions: [], redFlags: [], notes: [] }
  const actions = analysis.abnormal.map((it, idx) => ({
    code: it.code,
    level: it.status === 'crit' ? 'crit' : idx < 3 ? 'high' : 'mid',
    title: `${it.name}${STATUS_TEXT[it.status]}：${it.value}${it.unit}`,
    detail: [it.deviation, it.advice, target(it.code, member, analysis)].filter(Boolean).join('；')
  }))
  const redFlags = analysis.criticalAlerts.map(i => `${i.name} 达到危急值（${i.value}${i.unit}），请尽快就医复核`)
  return { actions, redFlags, notes: personalNotes(member, analysis) }
}

function findIndicators(q, analysis) {
  if (!analysis) return []
  const up = q.toUpperCase()
  const found = new Set()
  analysis.items.forEach(i => { if (q.includes(i.name) || up.includes(i.en.toUpperCase())) found.add(i.code) })
  const byAlias = matchIndicator(q)
  if (byAlias) found.add(byAlias)
  Object.entries(SYS_KEYWORDS).forEach(([sys, kws]) => {
    if (kws.some(k => up.includes(k.toUpperCase()))) analysis.items.filter(i => i.sys === sys).forEach(i => found.add(i.code))
  })
  return analysis.items.filter(i => found.has(i.code))
}

function indicatorBlock(it, member, analysis) {
  const t = target(it.code, member, analysis)
  const parts = [
    `· ${it.name}（${it.en}）：${it.value}${it.unit}，参考 ${it.ref[0]}–${it.ref[1]}${it.unit}，${STATUS_TEXT[it.status]}`,
    it.deviation ? `  解读：${it.deviation}` : null,
    it.advice ? `  建议：${it.advice}` : null,
    t ? `  目标：${t}` : null
  ]
  const trend = analysis.insights.find(x => x.code === it.code)
  if (trend) parts.push(`  趋势：${trend.text}`)
  return parts.filter(Boolean).join('\n')
}

// 主入口：本地规则回答
export function answer(analysis, member, question) {
  if (!analysis) {
    return { agent: 'parse', text: `${member?.name || '该成员'}还没有体检报告，请先上传报告，之后我就能基于报告回答问题了。` }
  }
  const q = question.trim()
  const inds = findIndicators(q, analysis)
  const { actions, redFlags } = prioritizedAdvice(analysis, member)

  if (inds.length) {
    const blocks = inds.map(i => indicatorBlock(i, member, analysis)).join('\n\n')
    const sysRisk = [...new Set(inds.map(i => i.sys))].map(s => analysis.systems.find(x => x.key === s)).filter(Boolean)
    const sysLine = sysRisk.length ? `\n\n相关系统风险：${sysRisk.map(s => `${s.name} ${s.risk}/100（${s.level.label}）`).join('、')}。` : ''
    return {
      agent: inds.some(i => i.status !== 'normal') ? 'reason' : 'parse',
      text: `关于${member.name}的以下指标：\n\n${blocks}${sysLine}`,
      chips: ['需要复查哪些项目？', '饮食上要注意什么？', '哪个系统风险最高？']
    }
  }

  if (/危急|紧急|危险/.test(q)) {
    if (!redFlags.length) return { agent: 'reason', text: `${member.name}本次没有达到危急值的指标，请放心。` }
    return { agent: 'reason', text: `${member.name}存在危急值，请尽快处理：\n${redFlags.map(r => '· ' + r).join('\n')}\n\n建议携带报告前往${analysis.department || '相关科室'}复核。` }
  }

  if (/复查|检查|就医|科室|做什么|计划|下一步|怎么治/.test(q)) {
    return {
      agent: 'decide',
      text: `${member.name}的复查与就医计划（按优先级）：\n\n${analysis.followUp.map((f, i) => `${i + 1}. ${f}`).join('\n')}${analysis.department ? `\n\n建议就诊科室：${analysis.department}。` : ''}`,
      chips: ['饮食上要注意什么？', '这些指标严重吗？']
    }
  }

  if (/饮食|吃|忌口|减脂|控糖|生活方式|调理|作息|睡眠/.test(q)) {
    return {
      agent: 'decide',
      text: `${member.name}的生活方式干预建议（针对本次异常）：\n${analysis.lifestyle.map(l => '· ' + l).join('\n')}${personalNotes(member, analysis).length ? `\n\n个体化提醒：\n${personalNotes(member, analysis).map(l => '· ' + l).join('\n')}` : ''}`,
      chips: ['需要复查哪些项目？', '运动怎么安排？']
    }
  }

  if (/运动|锻炼|健身/.test(q)) {
    return {
      agent: 'decide',
      text: `结合${member.name}的情况，运动建议：\n· 以中等强度有氧运动为主（快走、游泳、骑行），每周 150 分钟以上，分散到 5 天\n· 若存在心脑血管高风险，开始前建议先做运动风险评估\n· 合并高尿酸时避免剧烈无氧运动，运动后充分补水\n· 合并脂肪肝/转氨酶升高时，减重是核心，目标 6 个月内减重 5%~10%`,
      chips: ['饮食上要注意什么？', '需要复查哪些项目？']
    }
  }

  if (/风险|严重|要紧|系统|哪个/.test(q)) {
    const sorted = [...analysis.systems].sort((x, y) => y.risk - x.risk)
    return {
      agent: 'reason',
      text: `${member.name}各系统风险指数：\n${sorted.map(s => `· ${s.name}：${s.risk}/100（${s.level.label}）`).join('\n')}\n\n风险最高的为${sorted[0].name}，${analysis.reasoning[0]?.conclusion || '建议优先干预。'}`,
      chips: ['需要复查哪些项目？', '平时要注意什么？']
    }
  }

  if (/趋势|历年|变化|越来越/.test(q)) {
    if (!analysis.insights.length) return { agent: 'reason', text: '目前只积累了不足两年的数据，上传更多历史报告后我就能分析趋势。' }
    return { agent: 'reason', text: `${member.name}的历年趋势：\n${analysis.insights.map(i => `· ${i.text}${i.bad && i.up ? '，建议重点关注' : ''}`).join('\n')}` }
  }

  if (/总结|总体|整体|怎么样|概况|报告|评估/.test(q)) {
    const top = [...analysis.systems].sort((x, y) => y.risk - x.risk).filter(s => s.risk >= 20).slice(0, 3)
    return {
      agent: 'reason',
      text: `${analysis.summary}\n\n主要推理结论：\n${analysis.reasoning.map(x => `· ${x.title}：${x.conclusion}`).join('\n')}\n\n优先行动（前 3 项）：\n${actions.slice(0, 3).map((a, i) => `${i + 1}. ${a.title} — ${a.detail}`).join('\n')}\n\n需要重点关注的系统：${top.map(s => `${s.name}（${s.level.label}）`).join('、') || '暂无'}。`,
      chips: ['需要复查哪些项目？', '饮食上要注意什么？']
    }
  }

  const first = analysis.abnormal[0]
  return {
    agent: 'parse',
    text: `我掌握的是${member.name}的体检数据（综合风险指数 ${analysis.overallRisk}/100，${analysis.overallLevel.label}）。你可以这样问：\n· ${first ? first.name + '严重吗，要怎么办' : '整体情况怎么样'}\n· 需要复查哪些项目\n· 血脂/肝功能要注意什么\n· 哪个系统风险最高\n· 饮食和运动怎么安排`,
    chips: ['整体情况怎么样？', '需要复查哪些项目？', '饮食上要注意什么？']
  }
}

// 报告级"深度建议"（默认机制），用于报告页展示
export function reportAdvice(analysis, member) {
  if (!analysis) return null
  const { actions, redFlags, notes } = prioritizedAdvice(analysis, member)
  return {
    summary: analysis.summary,
    priority: actions.slice(0, 4),
    redFlags,
    notes,
    followUp: analysis.followUp,
    department: analysis.department
  }
}

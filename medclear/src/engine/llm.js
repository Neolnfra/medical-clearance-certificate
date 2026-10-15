// 大模型接入：兼容 OpenAI Chat Completions 协议，另提供无需密钥的“演示模式”
import { answer as ruleAnswer, reportAdvice } from './advisor.js'

export const PRESETS = {
  demo: { name: '演示模式（本地模拟，无需密钥）', baseUrl: '', model: 'medclear-demo' },
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  dashscope: { name: '通义千问（阿里云）', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  moonshot: { name: 'Kimi（月之暗面）', baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  custom: { name: '自定义（OpenAI 兼容接口）', baseUrl: '', model: '' }
}

export const SYSTEM_PROMPT = `你是"明检 MedClear"家庭健康解读助手，面向普通家庭用户，帮助其读懂体检报告并给出可执行的健康建议。
要求：
1. 必须严格基于用户提供的体检指标数据作答，不得编造未提供的检查结果或数值。
2. 回答结构清晰：先给结论，再给依据（引用具体指标与数值），最后给可执行建议；必要时用分点。
3. 建议要个体化、可量化（尽量给出控制目标），并结合用户的年龄、性别与既往史。
4. 只做健康科普与就医参考，不做诊断、不开处方；出现危急值或明显异常时，明确建议尽快就医。
5. 使用简体中文，语气专业、克制、易懂，不要使用 emoji。`

// 将结构化健康数据转成给大模型的上下文
export function buildContext(member, analysis) {
  if (!member || !analysis) return '暂无数据'
  const lines = []
  lines.push(`【用户】${member.name}，${member.role}，${member.sex}，${member.age}岁`)
  if (member.profile?.length) lines.push(`【既往史/画像】${member.profile.join('；')}`)
  lines.push(`【综合评估】健康评分 ${analysis.healthScore}/100，综合风险指数 ${analysis.overallRisk}/100（${analysis.overallLevel.label}），异常 ${analysis.abnormalCount} 项`)
  lines.push(`【器官系统风险】${analysis.systems.map(s => `${s.name} ${s.risk}/100(${s.level.label})`).join('，')}`)
  lines.push(`【异常指标】`)
  analysis.abnormal.forEach(i => lines.push(`- ${i.name}(${i.en}) ${i.value}${i.unit}，参考 ${i.ref[0]}~${i.ref[1]}，${i.status === 'crit' ? '危急' : i.status === 'high' ? '偏高' : '偏低'}；${i.deviation || ''}`))
  if (!analysis.abnormal.length) lines.push('- 无')
  lines.push(`【AI 推理结论】`)
  analysis.reasoning.forEach(r => lines.push(`- ${r.title}：${r.conclusion}`))
  if (analysis.insights.length) {
    lines.push(`【历年趋势】`)
    analysis.insights.forEach(i => lines.push(`- ${i.text}`))
  }
  return lines.join('\n')
}

function normalizeBase(url) { return String(url || '').replace(/\/+$/, '') }

// 调用 OpenAI 兼容接口
async function chat(settings, messages) {
  const url = normalizeBase(settings.baseUrl) + '/chat/completions'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (settings.apiKey || '') },
    body: JSON.stringify({ model: settings.model, messages, temperature: Number(settings.temperature) || 0.4, stream: false })
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`请求失败 HTTP ${res.status}${t ? '：' + t.slice(0, 160) : ''}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('大模型未返回有效内容')
  return text.trim()
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// 演示模式：无需密钥，用本地规则结果模拟大模型的口吻，便于在没有配置密钥时演示两种机制
async function demoAnswer(member, analysis, question) {
  await sleep(620)
  const a = ruleAnswer(analysis, member, question)
  const ra = reportAdvice(analysis, member)
  return `结合你提供的报告数据，我的判断如下：\n\n${a.text}\n\n补充说明：以上结论基于你本次上传的 ${analysis.items.length} 项指标（健康评分 ${analysis.healthScore}/100）。${ra.redFlags.length ? '其中存在危急值，建议优先处理。' : '建议按上述优先级逐项落实，并在复查后再次解读以观察变化。'}`
}

async function demoReportAdvice(member, analysis) {
  await sleep(720)
  const ra = reportAdvice(analysis, member)
  const lines = []
  lines.push(`综合 ${member.name} 本次 ${analysis.items.length} 项指标（健康评分 ${analysis.healthScore}/100，${analysis.overallLevel.label}），给出以下个性化解读与行动建议：`)
  lines.push('')
  if (ra.redFlags.length) { lines.push('一、需要尽快处理'); ra.redFlags.forEach(r => lines.push('· ' + r)); lines.push('') }
  lines.push('二、优先行动建议')
  ra.priority.forEach((p, i) => lines.push(`${i + 1}. ${p.title}\n   依据与目标：${p.detail}`))
  lines.push('')
  if (ra.notes.length) { lines.push('三、个体化提醒'); ra.notes.forEach(n => lines.push('· ' + n)); lines.push('') }
  lines.push('四、复查与就医')
  ra.followUp.forEach((f, i) => lines.push(`${i + 1}. ${f}`))
  if (ra.department) lines.push(`建议科室：${ra.department}`)
  lines.push('')
  lines.push('以上为健康科普与就医参考，具体诊疗请以医生意见为准。')
  return lines.join('\n')
}

// 问答：启用大模型时使用
export async function generateAnswer(settings, member, analysis, question, history = []) {
  if (!analysis) return { text: `${member?.name || '该成员'}还没有体检报告，请先上传报告。`, provider: 'rules' }
  if (settings.provider === 'demo') return { text: await demoAnswer(member, analysis, question), provider: 'demo' }
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n以下是用户当前的健康档案与报告数据：\n' + buildContext(member, analysis) },
    ...history.slice(-6).map(m => ({ role: m.role === 'me' ? 'user' : 'assistant', content: m.text })),
    { role: 'user', content: question }
  ]
  const text = await chat(settings, messages)
  return { text, provider: 'llm' }
}

// 报告级深度建议：启用大模型时使用
export async function generateReportAdvice(settings, member, analysis) {
  if (!analysis) throw new Error('暂无报告数据')
  if (settings.provider === 'demo') return await demoReportAdvice(member, analysis)
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `请基于以下数据，为这位用户生成一份个性化的体检报告解读与优先行动建议，包含：\n1）总体结论；2）需要重点关注的指标及其依据；3）按优先级排列的行动建议（含可量化目标）；4）复查与就医建议。\n\n${buildContext(member, analysis)}` }
  ]
  return await chat(settings, messages)
}

// 测试连接
export async function testConnection(settings) {
  if (settings.provider === 'demo') { await sleep(400); return '演示模式可用（本地模拟，无需密钥）' }
  if (!settings.baseUrl) throw new Error('请填写接口地址 Base URL')
  const text = await chat(settings, [
    { role: 'system', content: '你是连接测试助手，只回复用户要求的内容。' },
    { role: 'user', content: '请只回复四个字：连接成功' }
  ])
  return text
}

export function isLlmReady(settings) {
  if (!settings?.llmEnabled) return false
  if (settings.provider === 'demo') return true
  return !!(settings.baseUrl && settings.model)
}

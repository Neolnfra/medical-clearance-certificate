import { reactive, watch } from 'vue'
import { seedMembers, seedReports, PALETTE } from './data/seed.js'
import { analyze } from './engine/analyze.js'
import { buildHistory } from './engine/history.js'

const LS_KEY = 'medclear.v2'

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return null
}

const saved = load()

export const store = reactive({
  view: 'overview',
  memberId: saved?.memberId || 'father',
  members: saved?.members?.length ? saved.members : seedMembers(),
  reports: saved?.reports || seedReports(), // { memberId: [report, ...] } 按日期倒序
  done: saved?.done || {},
  chats: saved?.chats || {}, // { memberId: [{ role, agent, text }] } 多轮对话记录
  dataRev: 0, // 成员/报告数据版本号，用于分析结果缓存失效
  settingsOpen: false,
  toast: '',
  settings: saved?.settings || {
    llmEnabled: false,
    provider: 'demo',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    temperature: 0.4
  }
})

let timer = null
function persist() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        memberId: store.memberId, members: store.members, reports: store.reports,
        done: store.done, chats: store.chats, settings: store.settings
      }))
    } catch (e) { /* ignore */ }
  }, 250)
}
watch(() => [store.members, store.reports, store.done, store.memberId, store.settings, store.chats], persist, { deep: true })
// 数据版本：成员或报告变化时递增，驱动依赖它的 computed 重新计算并使分析缓存失效
watch(() => [store.members, store.reports], () => { store.dataRev++ }, { deep: true })

export function toast(msg) {
  store.toast = msg
  setTimeout(() => { if (store.toast === msg) store.toast = '' }, 2600)
}
export function setView(v) { store.view = v }

/* ---------------- 查询 ---------------- */
export function getMember(id) { return store.members.find(m => m.id === id) }
export function reportsOf(id) { return store.reports[id] || [] }
export function latestReport(id) { return reportsOf(id)[0] || null }
export function reportById(id, rid) { return reportsOf(id).find(r => r.id === rid) || null }

// 分析结果缓存：以 dataRev 为版本，数据未变时跨组件复用，避免重复计算
const analysisCache = new Map()
let cacheRev = -1
function ensureCacheRev() {
  const rev = store.dataRev // 读取响应式版本号，建立依赖
  if (rev !== cacheRev) { analysisCache.clear(); cacheRev = rev }
}

// 从该成员的全部历史报告中构建 指标 -> [{y,v}] 序列（用于趋势）
export function historyOf(id) {
  ensureCacheRev()
  const key = 'h:' + id
  if (analysisCache.has(key)) return analysisCache.get(key)
  const history = buildHistory(reportsOf(id))
  analysisCache.set(key, history)
  return history
}

// 对某成员的报告做完整分析（默认最新一份）。读取 store，故在 computed 中调用可自动响应数据变化。
export function analyzeMember(id, reportId = null) {
  ensureCacheRev()
  const key = 'a:' + id + ':' + (reportId || 'latest')
  if (analysisCache.has(key)) return analysisCache.get(key)
  const m = getMember(id)
  const r = reportId ? reportById(id, reportId) : latestReport(id)
  const result = (!m || !r) ? null : { ...analyze(r, m, historyOf(id)), report: r, member: m }
  analysisCache.set(key, result)
  return result
}

/* ---------------- 成员 CRUD ---------------- */
export function addMember(data) {
  const id = 'm' + Date.now()
  const member = {
    id,
    name: data.name || '新成员',
    role: data.role || '家属',
    sex: data.sex || '男',
    age: Number(data.age) || 30,
    avatar: (data.name || '新').slice(0, 1),
    color: PALETTE[store.members.length % PALETTE.length],
    profile: data.profile || []
  }
  store.members.push(member)
  store.reports[id] = []
  return member
}
export function updateMember(id, patch) {
  const m = getMember(id)
  if (!m) return
  Object.assign(m, patch)
  if (patch.name) m.avatar = patch.name.slice(0, 1)
}
export function removeMember(id) {
  store.members = store.members.filter(m => m.id !== id)
  delete store.reports[id]
  delete store.chats[id]
  if (store.memberId === id) store.memberId = store.members[0]?.id || ''
}

/* ---------------- 报告 CRUD ---------------- */
export function upsertReport(memberId, report) {
  const list = reportsOf(memberId).filter(r => r.id !== report.id)
  list.push(report)
  list.sort((a, b) => (a.date < b.date ? 1 : -1))
  store.reports[memberId] = list
}
export function removeReport(memberId, reportId) {
  store.reports[memberId] = reportsOf(memberId).filter(r => r.id !== reportId)
}

/* ---------------- 对话记录（按成员持久化） ---------------- */
export function getChat(memberId) { return store.chats[memberId] || null }
export function saveChat(memberId, messages) {
  store.chats[memberId] = messages
    .filter(m => m && m.text)
    .map(m => ({ role: m.role, agent: m.agent || null, text: m.text }))
}
export function clearChat(memberId) { delete store.chats[memberId] }

export function resetAll() {
  store.members = seedMembers()
  store.reports = seedReports()
  store.done = {}
  store.chats = {}
  store.memberId = 'father'
  toast('已恢复内置示例数据')
}

<script setup>
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { store, analyzeMember, getMember, getChat, saveChat, clearChat } from '../store.js'
import { answer as ruleAnswer } from '../engine/advisor.js'
import { generateAnswer, isLlmReady } from '../engine/llm.js'
import Icon from '../components/Icon.vue'

const member = computed(() => getMember(store.memberId))
const a = computed(() => analyzeMember(store.memberId))
const llmReady = computed(() => isLlmReady(store.settings))

const messages = ref([])
const input = ref('')
const typing = ref(false)
const generating = ref(false)
const elapsed = ref(0)
const body = ref(null)
let timer = null

const AGENT = {
  parse: { label: '数据解析智能体', cls: 'brand' },
  reason: { label: '风险推理智能体', cls: 'violet' },
  decide: { label: '建议决策智能体', cls: 'blue' },
  llm: { label: '大模型增强', cls: 'violet' },
  demo: { label: '大模型增强（演示）', cls: 'violet' },
  fallback: { label: '本地规则引擎（降级）', cls: 'warn' }
}

function buildGreeting() {
  const m = member.value
  const r = a.value
  const mode = llmReady.value ? '当前已启用大模型增强回答' : '当前使用本地规则引擎回答（可在设置中启用大模型）'
  if (!r) return { role: 'ai', agent: 'parse', text: `${m?.name || '该成员'}还没有体检报告，请先到「报告智能解读」上传报告。${mode}。` }
  return {
    role: 'ai', agent: 'reason',
    text: `你好，我是${m.name}（${m.role}）的健康助手，已读取其 ${r.items.length} 项体检指标。\n本次综合风险指数 ${r.overallRisk}/100，等级「${r.overallLevel.label}」，共有 ${r.abnormalCount} 项异常。\n${mode}。\n你可以问我：某项指标是什么意思、严不严重、需要复查什么、饮食如何调整。`
  }
}

// 从持久化存储恢复该成员的完整对话；无记录时给出欢迎语
function loadMessages(id) {
  const stored = getChat(id)
  if (stored && stored.length) {
    return stored.map(m => ({ role: m.role, agent: m.agent, text: m.text, shown: m.text }))
  }
  const g = buildGreeting()
  return [{ ...g, shown: g.text }]
}

messages.value = loadMessages(store.memberId)
persistChat()

function persistChat() { saveChat(store.memberId, messages.value) }

// 切换成员：先保存当前对话，再载入目标成员的会话
watch(() => store.memberId, (newId, oldId) => {
  if (oldId && getMember(oldId)) saveChat(oldId, messages.value)
  messages.value = loadMessages(newId)
  scrollDown()
})

// 切换引擎模式时给出提示，并保留已有上下文
watch(() => store.settings.llmEnabled, () => {
  const g = buildGreeting()
  g.shown = g.text
  messages.value.push(g)
  persistChat()
  scrollDown()
})

async function send(text) {
  const q = (text ?? input.value).trim()
  if (!q || typing.value) return
  input.value = ''
  messages.value.push({ role: 'me', text: q, shown: q })
  persistChat()
  await scrollDown()

  const useLlm = llmReady.value && !!a.value
  typing.value = true
  generating.value = useLlm
  elapsed.value = 0
  startTimer()
  await sleep(useLlm ? 120 : 260)

  let ans
  if (useLlm) {
    try {
      const prior = messages.value.slice(0, -1)
      const res = await generateAnswer(store.settings, member.value, a.value, q, prior)
      ans = { agent: res.provider === 'demo' ? 'demo' : 'llm', text: res.text }
    } catch (e) {
      const fb = ruleAnswer(a.value, member.value, q)
      ans = { agent: 'fallback', text: `大模型调用失败（${e.message || '未知错误'}），已自动降级为本地规则引擎：\n\n${fb.text}` }
    }
  } else {
    ans = ruleAnswer(a.value, member.value, q)
  }

  stopTimer()
  typing.value = false
  generating.value = false
  const msg = reactive({ role: 'ai', agent: ans.agent, text: ans.text, shown: '' })
  messages.value.push(msg)
  persistChat()
  await scrollDown()
  typewriter(msg, ans.text)
}

function startTimer() {
  stopTimer()
  timer = setInterval(() => { elapsed.value++ }, 1000)
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null } }
onBeforeUnmount(stopTimer)

function typewriter(msg, full) {
  let i = 0
  const step = () => { i += 3; msg.shown = full.slice(0, i); scrollDown(); if (i < full.length) setTimeout(step, 14) }
  step()
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
async function scrollDown() { await nextTick(); if (body.value) body.value.scrollTop = body.value.scrollHeight }

function doClear() {
  if (window.confirm(`确定清空与${member.value.name}的对话记录吗？`)) {
    clearChat(store.memberId)
    const g = buildGreeting()
    messages.value = [{ ...g, shown: g.text }]
    persistChat()
  }
}

const QUICK = ['整体情况怎么样？', '需要复查哪些项目？', '哪个系统风险最高？', '饮食上要注意什么？']
</script>

<template>
  <div v-if="!member" class="card card-pad"><div class="empty">请先在「家庭成员档案」添加成员</div></div>
  <div v-else class="layout-aside-right">
    <div class="card card-pad">
      <div class="card-head">
        <div class="avatar-circle" :style="{ background: member.color, width: '36px', height: '36px', fontSize: '15px' }">{{ member.avatar }}</div>
        <div>
          <div class="card-title">{{ member.name }}的专属健康助手</div>
          <div class="card-sub">多智能体协同：解析 · 推理 · 决策 · 对话上下文自动保存</div>
        </div>
        <div class="spacer"></div>
        <button class="btn sm ghost" @click="doClear">清空对话</button>
        <button class="mode-pill" :class="{ on: llmReady }" @click="store.settingsOpen = true">
          <Icon :name="llmReady ? 'spark' : 'cpu'" :size="14" />
          {{ llmReady ? '大模型增强' : '本地规则引擎' }}
        </button>
      </div>

      <div v-if="store.settings.llmEnabled && !llmReady" class="disclaimer" style="margin-bottom:12px">
        已开启大模型但尚未完成配置（缺少接口地址或模型），当前仍使用本地规则引擎。点击右上角切换或前往设置完善。
      </div>

      <div class="chat-wrap">
        <div ref="body" class="chat-body">
          <div v-for="(msg, i) in messages" :key="i" class="msg" :class="{ me: msg.role === 'me' }">
            <div class="avatar" :class="msg.role === 'me' ? 'user' : 'ai'">
              <template v-if="msg.role === 'me'">{{ member.avatar }}</template>
              <Icon v-else name="shield" :size="16" />
            </div>
            <div>
              <div v-if="msg.role === 'ai' && msg.agent" style="margin-bottom:5px">
                <span :class="'pill ' + AGENT[msg.agent].cls" style="font-size:10.5px">{{ AGENT[msg.agent].label }}</span>
              </div>
              <div class="bubble" :class="msg.role === 'me' ? 'me' : 'ai'" style="white-space:pre-line">{{ msg.shown }}</div>
            </div>
          </div>

          <!-- 等待 / 生成中提示 -->
          <div v-if="typing" class="msg">
            <div class="avatar ai"><Icon name="shield" :size="16" /></div>
            <div class="bubble ai" style="min-width:260px">
              <div style="display:flex;align-items:center;gap:9px">
                <span class="spinner"></span>
                <span v-if="generating">正在调用大模型生成回复，请耐心等待…</span>
                <span v-else>正在分析指标数据<span class="dots"><i></i><i></i><i></i></span></span>
                <span v-if="generating" class="muted" style="margin-left:auto;font-size:12px">{{ elapsed }}s</span>
              </div>
              <div v-if="generating" class="wait-bar"><i></i></div>
              <div v-if="generating && elapsed >= 4" class="muted" style="font-size:11.5px;margin-top:7px">
                大模型响应较慢，仍在生成中，请不要关闭或离开页面。
              </div>
              <div v-else-if="generating" class="muted" style="font-size:11.5px;margin-top:6px">
                正在结合你的体检数据推理并组织建议。
              </div>
            </div>
          </div>
        </div>

        <div class="quick-q">
          <button v-for="(q, i) in QUICK" :key="i" :disabled="typing" @click="send(q)">{{ q }}</button>
        </div>
        <div class="chat-input">
          <input v-model="input" :placeholder="typing ? '正在生成回复，请稍候…' : '输入你想问的指标或健康问题…'" @keyup.enter="send()" :disabled="typing" />
          <button class="btn primary" @click="send()" :disabled="typing">
            <span v-if="typing" class="spinner" style="border-top-color:#fff;border-color:rgba(255,255,255,0.45);border-top-color:#fff"></span>
            <Icon v-else name="send" :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:18px">
      <div class="card card-pad">
        <div class="card-title" style="font-size:14px;margin-bottom:12px">当前档案</div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar-circle" :style="{ background: member.color }">{{ member.avatar }}</div>
          <div>
            <div style="font-weight:700">{{ member.name }}</div>
            <div class="muted" style="font-size:11.5px">{{ member.role }} · {{ member.age }}岁 · {{ member.sex }}</div>
          </div>
        </div>
        <hr class="hr" />
        <div v-if="a" class="muted" style="font-size:12px;line-height:2">
          健康评分：<b style="color:var(--ink)">{{ a.healthScore }}</b><br />
          综合风险：<b style="color:var(--ink)">{{ a.overallRisk }}/100</b>（{{ a.overallLevel.label }}）<br />
          异常指标：<b style="color:var(--ink)">{{ a.abnormalCount }} 项</b><br />
          需干预系统：<b style="color:var(--ink)">{{ a.systemCount }} 个</b>
        </div>
        <div v-else class="muted" style="font-size:12.5px">暂无报告</div>
        <hr class="hr" />
        <div class="muted" style="font-size:11.5px;line-height:1.7">
          对话记录按成员保存在本机，切换到其他页面再返回、甚至刷新浏览器后仍会保留，可继续多轮对话。
        </div>
      </div>
      <div v-if="a" class="card card-pad">
        <div class="card-title" style="font-size:14px;margin-bottom:10px">可问的指标</div>
        <div style="display:flex;flex-wrap:wrap;gap:7px">
          <button v-for="it in a.abnormal" :key="it.code" class="tag" style="border:0;cursor:pointer" :disabled="typing" @click="send(it.name + '严重吗？')">{{ it.name }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

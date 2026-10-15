<script setup>
import { computed } from 'vue'
import { store, setView } from './store.js'
import { isLlmReady } from './engine/llm.js'
import Icon from './components/Icon.vue'
import SettingsModal from './components/SettingsModal.vue'
import Overview from './views/Overview.vue'
import Analyze from './views/Analyze.vue'
import Members from './views/Members.vue'
import Assistant from './views/Assistant.vue'
import Actions from './views/Actions.vue'

const NAV = [
  { key: 'overview', label: '家庭健康总览', icon: 'overview' },
  { key: 'analyze', label: '报告智能解读', icon: 'scan' },
  { key: 'members', label: '家庭成员档案', icon: 'users' },
  { key: 'actions', label: '复查与行动计划', icon: 'calendar' },
  { key: 'assistant', label: 'AI 健康助手', icon: 'message' }
]

const VIEWS = { overview: Overview, analyze: Analyze, members: Members, actions: Actions, assistant: Assistant }

const PAGE = {
  overview: { title: '家庭健康总览', desc: 'AI 汇总全家体检数据，集中呈现风险分布与待办事项' },
  analyze: { title: '报告智能解读', desc: '感知 → 推理 → 决策：一份体检报告，三步读懂并给出行动方案' },
  members: { title: '家庭成员档案', desc: '健康画像与历年报告归档，让 AI 更懂每一位家人' },
  actions: { title: '复查与行动计划', desc: '把体检结论转化为可执行、可跟踪的健康任务' },
  assistant: { title: 'AI 健康助手', desc: '基于家庭档案与报告的多轮追问，解释每一项指标' }
}

const current = computed(() => VIEWS[store.view])
const page = computed(() => PAGE[store.view])
const showSwitch = computed(() => ['overview', 'analyze', 'members', 'assistant'].includes(store.view))
const llmReady = computed(() => isLlmReady(store.settings))
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-logo"><Icon name="shield" :size="21" /></div>
        <div>
          <div class="brand-name">明检 MedClear</div>
          <div class="brand-sub">家庭健康智析中枢</div>
        </div>
      </div>

      <div class="nav-group-label">工作台</div>
      <button v-for="n in NAV" :key="n.key" class="nav-item" :class="{ active: store.view === n.key }" @click="setView(n.key)">
        <span class="ico"><Icon :name="n.icon" :size="18" /></span>{{ n.label }}
      </button>
    </aside>

    <main class="main">
      <header class="topbar">
        <div>
          <div class="page-title">{{ page.title }}</div>
          <div class="page-desc">{{ page.desc }}</div>
        </div>
        <div class="topbar-spacer"></div>
        <div v-if="showSwitch" class="member-switch">
          <button v-for="m in store.members" :key="m.id" class="member-chip" :class="{ on: store.memberId === m.id }" @click="store.memberId = m.id">
            {{ m.role }}
          </button>
        </div>
        <button class="mode-pill" :class="{ on: llmReady }" title="设置回答建议引擎" @click="store.settingsOpen = true">
          <Icon :name="llmReady ? 'spark' : 'cpu'" :size="14" />
          {{ llmReady ? '大模型增强' : '本地规则引擎' }}
        </button>
        <button class="icon-btn" title="设置" @click="store.settingsOpen = true"><Icon name="settings" :size="18" /></button>
      </header>

      <section class="content">
        <component :is="current" />
      </section>
    </main>

    <transition name="fade">
      <div v-if="store.toast" style="position:fixed;left:50%;bottom:36px;transform:translateX(-50%);background:#0f1b2d;color:#fff;padding:11px 20px;border-radius:12px;font-size:13px;z-index:99;box-shadow:var(--shadow-lg)">
        {{ store.toast }}
      </div>
    </transition>

    <SettingsModal v-if="store.settingsOpen" @close="store.settingsOpen = false" />
  </div>
</template>

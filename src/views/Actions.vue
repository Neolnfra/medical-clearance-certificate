<script setup>
import { ref, computed } from 'vue'
import { store, analyzeMember, toast } from '../store.js'
import Icon from '../components/Icon.vue'

const BASE = new Date()
function plusDays(n) { const d = new Date(BASE); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
function daysLeft(due) { return Math.round((new Date(due) - BASE) / 86400000) }

const tasks = computed(() => {
  const list = []
  store.members.forEach(m => {
    const a = analyzeMember(m.id)
    if (!a) return
    a.criticalAlerts.forEach(it => list.push({
      id: `crit-${m.id}-${it.code}`, member: m, priority: 0,
      title: `复核 ${it.name} 危急值`,
      detail: `${m.role}的 ${it.name}（${it.value}${it.unit}）达到危急值，请尽快到${a.department || '相关科室'}就诊复核。`,
      due: plusDays(3)
    }))
    a.systems.filter(s => s.risk >= 40).forEach(s => list.push({
      id: `follow-${m.id}-${s.key}`, member: m, priority: 1,
      title: `${s.name}系统复查`,
      detail: `${m.role}的${s.name}风险指数 ${s.risk}（${s.level.label}），建议按复查计划就诊并完善相关检查。`,
      due: plusDays(14)
    }))
    if (!a.criticalAlerts.length && !a.systems.some(s => s.risk >= 40)) list.push({
      id: `routine-${m.id}`, member: m, priority: 3,
      title: '保持年度体检',
      detail: `${m.role}本次指标良好，建议保持健康生活方式并坚持年度体检。`,
      due: plusDays(180)
    })
  })
  return list
})

const done = computed(() => store.done)
const filter = ref('all')

const filtered = computed(() => {
  const list = filter.value === 'all' ? tasks.value : tasks.value.filter(t => t.member.id === filter.value)
  return [...list].sort((a, b) => (done.value[a.id] ? 1 : 0) - (done.value[b.id] ? 1 : 0) || a.priority - b.priority)
})
const progress = computed(() => {
  const total = tasks.value.length
  const d = tasks.value.filter(t => done.value[t.id]).length
  return { total, d, pct: total ? Math.round((d / total) * 100) : 0 }
})
const PRIORITY = { 0: { label: '紧急', cls: 'crit' }, 1: { label: '重要', cls: 'warn' }, 3: { label: '常规', cls: 'blue' } }

function toggle(t) {
  store.done[t.id] = !store.done[t.id]
  if (store.done[t.id]) toast(`已完成：${t.title}`)
}
function resetAll() {
  Object.keys(store.done).forEach(k => delete store.done[k])
  toast('已重置全部任务')
}
</script>

<template>
  <div>
    <div class="grid g-3" style="margin-bottom:18px">
      <div class="card stat">
        <div class="stat-label"><Icon name="target" :size="15" /> 行动任务总数</div>
        <div class="stat-value">{{ progress.total }}<small>项</small></div>
        <div class="stat-foot">由 AI 从体检结论自动拆解</div>
      </div>
      <div class="card stat">
        <div class="stat-label"><Icon name="check" :size="15" /> 已完成</div>
        <div class="stat-value" style="color:var(--ok)">{{ progress.d }}<small>项</small></div>
        <div class="stat-foot">完成率 {{ progress.pct }}%</div>
      </div>
      <div class="card stat">
        <div class="stat-label"><Icon name="activity" :size="15" /> 整体进度</div>
        <div style="margin-top:12px">
          <div class="ind-bar" style="height:10px"><i :style="{ width: progress.pct + '%', background: 'linear-gradient(90deg,var(--brand),var(--accent))' }"></i></div>
          <div class="muted" style="font-size:12px;margin-top:8px">按优先级推进，先处理危急与重要任务</div>
        </div>
      </div>
    </div>

    <div class="card card-pad">
      <div class="card-head">
        <div class="card-title">健康行动计划</div>
        <div class="spacer"></div>
        <div class="member-switch">
          <button class="member-chip" :class="{ on: filter === 'all' }" @click="filter = 'all'">全部</button>
          <button v-for="m in store.members" :key="m.id" class="member-chip" :class="{ on: filter === m.id }" @click="filter = m.id">{{ m.role }}</button>
        </div>
        <button class="btn sm" style="margin-left:10px" @click="resetAll">重置</button>
      </div>

      <div v-if="filtered.length" style="display:flex;flex-direction:column;gap:11px">
        <div v-for="t in filtered" :key="t.id" class="card" style="padding:14px 16px;border:1px solid var(--line);display:flex;gap:14px;align-items:flex-start" :style="{ opacity: done[t.id] ? 0.55 : 1 }">
          <button class="avatar-circle" :style="{ background: done[t.id] ? 'var(--ok)' : '#eef2f8', color: done[t.id] ? '#fff' : '#94a6bf', width: '34px', height: '34px', cursor: 'pointer' }" @click="toggle(t)">
            <Icon name="check" :size="17" />
          </button>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span :class="'pill ' + PRIORITY[t.priority].cls">{{ PRIORITY[t.priority].label }}</span>
              <b style="font-size:14px" :style="{ textDecoration: done[t.id] ? 'line-through' : 'none' }">{{ t.title }}</b>
              <span class="muted" style="font-size:11.5px">· {{ t.member.role }}</span>
            </div>
            <div style="font-size:12.5px;color:var(--ink-2);line-height:1.7;margin-top:6px">{{ t.detail }}</div>
            <div style="margin-top:7px;display:flex;gap:12px;align-items:center">
              <span class="muted" style="font-size:11.5px;display:inline-flex;align-items:center;gap:5px"><Icon name="calendar" :size="13" /> 截止 {{ t.due }}</span>
              <span :class="daysLeft(t.due) <= 7 ? 'pill danger' : 'pill grey'" style="font-size:10.5px">剩余 {{ daysLeft(t.due) }} 天</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty">暂无任务，请先在「报告智能解读」中完成报告分析</div>
    </div>
  </div>
</template>

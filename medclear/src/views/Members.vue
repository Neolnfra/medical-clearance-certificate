<script setup>
import { ref, computed } from 'vue'
import { store, setView, analyzeMember, historyOf, reportsOf, removeMember, removeReport, toast } from '../store.js'
import { pill, statusPill, STATUS_TEXT, LEVEL_COLOR } from '../utils.js'
import ChartBox from '../components/ChartBox.vue'
import Icon from '../components/Icon.vue'
import MemberModal from '../components/MemberModal.vue'
import ReportImportModal from '../components/ReportImportModal.vue'

const memberModal = ref({ open: false, member: null })
const importModal = ref({ open: false, memberId: '' })

const current = computed(() => store.members.find(m => m.id === store.memberId) || store.members[0] || null)
const analysis = computed(() => (current.value ? analyzeMember(current.value.id) : null))
const reps = computed(() => (current.value ? reportsOf(current.value.id) : []))
const history = computed(() => (current.value ? historyOf(current.value.id) : {}))

const radarOption = computed(() => {
  const a = analysis.value
  if (!a) return {}
  return {
    tooltip: {},
    radar: {
      indicator: a.systems.map(s => ({ name: s.name, max: 100 })), radius: '66%', center: ['50%', '54%'],
      splitLine: { lineStyle: { color: '#e8eef7' } }, splitArea: { areaStyle: { color: ['#fbfdff', '#f3f7fc'] } },
      axisName: { color: '#6b7c95', fontSize: 11 }
    },
    series: [{
      type: 'radar',
      data: [{ value: a.systems.map(s => s.risk), name: '系统风险', areaStyle: { color: 'rgba(47,107,255,0.14)' }, lineStyle: { color: '#2f6bff', width: 2 }, itemStyle: { color: '#2f6bff' } }]
    }]
  }
})

const historyCodes = computed(() => Object.keys(history.value).filter(c => history.value[c].length >= 2))

function selectMember(id) { store.memberId = id }
function editMember(m) { memberModal.value = { open: true, member: m } }
function addMember() { memberModal.value = { open: true, member: null } }
function delMember(m) {
  if (window.confirm(`确定删除成员「${m.name}」及其全部报告吗？`)) {
    removeMember(m.id); toast('已删除成员')
  }
}
function openImport() { importModal.value = { open: true, memberId: current.value.id } }
function delReport(r) {
  if (window.confirm(`确定删除 ${r.date} 的报告吗？`)) { removeReport(current.value.id, r.id); toast('已删除报告') }
}
</script>

<template>
  <div v-if="!store.members.length" class="card card-pad">
    <div class="empty">还没有家庭成员</div>
    <div style="text-align:center"><button class="btn primary" @click="addMember">添加家庭成员</button></div>
  </div>

  <div v-else class="layout-aside">
    <div class="card" style="padding:14px;height:fit-content">
      <div style="display:flex;align-items:center;padding:4px 6px 12px">
        <div class="card-title">家庭成员</div>
        <div style="flex:1"></div>
        <button class="btn sm primary" @click="addMember">添加</button>
      </div>
      <div v-for="m in store.members" :key="m.id" class="sample-card" style="width:100%;margin-bottom:10px"
           :class="{ on: store.memberId === m.id }" @click="selectMember(m.id)">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar-circle" :style="{ background: m.color }">{{ m.avatar }}</div>
          <div style="flex:1;min-width:0;text-align:left">
            <div style="font-weight:700">{{ m.name }}</div>
            <div class="muted" style="font-size:11.5px">{{ m.role }} · {{ m.age }}岁 · {{ m.sex }}</div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn sm ghost" style="padding:5px 8px" @click.stop="editMember(m)">编辑</button>
            <button class="btn sm ghost" style="padding:5px 8px" @click.stop="delMember(m)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="current" style="display:flex;flex-direction:column;gap:18px">
      <div class="card card-pad">
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <div class="avatar-circle" :style="{ background: current.color, width: '56px', height: '56px', fontSize: '22px' }">{{ current.avatar }}</div>
          <div>
            <div style="font-weight:700;font-size:18px">{{ current.name }}
              <span v-if="analysis" :class="pill(analysis.overallLevel.key)" style="margin-left:6px">{{ analysis.overallLevel.label }}</span>
            </div>
            <div class="muted" style="font-size:12.5px;margin-top:3px">{{ current.role }} · {{ current.sex }} · {{ current.age }}岁</div>
          </div>
          <div style="flex:1"></div>
          <div v-if="analysis" style="text-align:right">
            <div class="muted" style="font-size:12px">健康评分</div>
            <div style="font-size:30px;font-weight:800;color:LEVEL_COLOR[analysis.overallLevel.key]">{{ analysis.healthScore }}</div>
          </div>
        </div>
        <div v-if="current.profile?.length" class="hr"></div>
        <div v-if="current.profile?.length" style="display:flex;gap:8px;flex-wrap:wrap">
          <span v-for="(p, i) in current.profile" :key="i" class="tag">{{ p }}</span>
        </div>
        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn primary sm" @click="store.memberId = current.id; setView('analyze')" :disabled="!analysis">解读最新报告</button>
          <button class="btn sm" @click="openImport"><Icon name="upload" :size="14" style="vertical-align:-2px" /> 上传报告</button>
          <button class="btn sm" @click="setView('actions')">加入行动计划</button>
        </div>
      </div>

      <div v-if="analysis" class="grid g-2">
        <div class="card card-pad">
          <div class="card-head"><div class="card-title">器官系统风险</div></div>
          <ChartBox :option="radarOption" height="250px" />
        </div>
        <div class="card card-pad">
          <div class="card-head"><div class="card-title">报告归档</div><div class="spacer"></div><span class="pill blue">{{ reps.length }} 份</span></div>
          <div style="display:flex;flex-direction:column;gap:9px;max-height:270px;overflow:auto">
            <div v-for="r in reps" :key="r.id" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:11px">
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:13px">{{ r.date }} · {{ r.type }}</div>
                <div class="muted" style="font-size:11.5px">{{ r.org }} · {{ Object.keys(r.items).length }} 项指标 · {{ r.source }}</div>
              </div>
              <span v-if="r.partial" class="pill grey">趋势数据</span>
              <button class="btn sm ghost" @click="delReport(r)">删除</button>
            </div>
            <div v-if="!reps.length" class="empty">暂无报告，点击「上传报告」导入</div>
          </div>
        </div>
      </div>

      <div v-else class="card card-pad">
        <div class="empty" style="padding:34px 0">
          {{ current.name }} 还没有体检报告<br />
          <button class="btn primary" style="margin-top:14px" @click="openImport"><Icon name="upload" :size="14" style="vertical-align:-2px" /> 上传第一份报告</button>
        </div>
      </div>

      <div v-if="analysis" class="grid g-2">
        <div class="card card-pad">
          <div class="card-head"><div class="card-title">异常指标</div><span class="pill warn">{{ analysis.abnormal.length }} 项</span></div>
          <div v-if="analysis.abnormal.length" style="display:flex;flex-direction:column;gap:8px">
            <div v-for="it in analysis.abnormal" :key="it.code" style="display:flex;align-items:center;gap:8px;font-size:12.5px">
              <span :class="statusPill(it.status)">{{ STATUS_TEXT[it.status] }}</span>
              <span style="font-weight:600">{{ it.name }}</span>
              <span class="muted mono">{{ it.value }} {{ it.unit }}</span>
              <span class="muted" style="margin-left:auto">参考 {{ it.ref[0] }}–{{ it.ref[1] }}</span>
            </div>
          </div>
          <div v-else class="muted" style="font-size:12.5px">未见异常指标</div>
        </div>

        <div class="card card-pad">
          <div class="card-head"><div class="card-title">历年趋势</div><div class="card-sub">数据来自归档的历史报告</div></div>
          <div v-if="historyCodes.length" style="display:flex;flex-direction:column;gap:12px">
            <div v-for="code in historyCodes.slice(0, 5)" :key="code" style="display:flex;align-items:center;gap:10px">
              <span style="width:110px;font-size:12.5px;font-weight:600">{{ analysis.itemByCode[code]?.name || code }}</span>
              <div style="flex:1;display:flex;align-items:flex-end;gap:4px;height:40px">
                <div v-for="(p, i) in history[code]" :key="i" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
                  <div :style="{ height: Math.max(5, (p.v / Math.max(...history[code].map(x => x.v))) * 32) + 'px', width: '100%', borderRadius: '3px 3px 0 0', background: '#cfe0f7' }"></div>
                  <span class="muted" style="font-size:9.5px">{{ p.y }}</span>
                </div>
              </div>
              <span class="muted mono" style="width:70px;text-align:right;font-size:11.5px">{{ history[code].at(-1).v }} {{ analysis.itemByCode[code]?.unit }}</span>
            </div>
          </div>
          <div v-else class="empty">上传 2 份及以上报告即可生成趋势</div>
        </div>
      </div>
    </div>

    <MemberModal v-if="memberModal.open" :member="memberModal.member" @close="memberModal.open = false" @saved="() => {}" />
    <ReportImportModal v-if="importModal.open" :member-id="importModal.memberId" @close="importModal.open = false" @saved="() => {}" />
  </div>
</template>

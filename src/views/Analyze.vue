<script setup>
import { ref, computed, watch } from 'vue'
import { store, setView, toast, getMember, reportsOf, reportById, latestReport, analyzeMember, historyOf } from '../store.js'
import { pill, statusPill, STATUS_TEXT, LEVEL_COLOR } from '../utils.js'
import { reportAdvice } from '../engine/advisor.js'
import { generateReportAdvice, isLlmReady } from '../engine/llm.js'
import ChartBox from '../components/ChartBox.vue'
import Icon from '../components/Icon.vue'
import ReportImportModal from '../components/ReportImportModal.vue'

const stage = ref('pick') // pick | parsing | done
const stepState = ref([])
const detail = ref(null)
const importModal = ref(false)
const reportId = ref(latestReport(store.memberId)?.id || null)

watch(() => store.memberId, () => {
  reportId.value = latestReport(store.memberId)?.id || null
  stage.value = 'pick'
})

const STEPS = [
  { phase: '感知', name: '版式识别与 OCR', desc: '定位表格区域，识别检验项目名称与数值' },
  { phase: '感知', name: '指标结构化抽取', desc: '解析指标、数值、单位，匹配标准项目编码' },
  { phase: '推理', name: '参考区间比对', desc: '按性别与年龄匹配参考区间，判定偏高 / 偏低 / 危急值' },
  { phase: '推理', name: '多指标交叉推理', desc: '调用医学知识库，构建指标关联与根因推理链' },
  { phase: '推理', name: '器官系统风险建模', desc: '按系统聚合负荷，计算综合风险指数与健康评分' },
  { phase: '决策', name: '生成行动方案', desc: '输出复查计划、生活方式干预与就医建议' }
]

const selectedMember = computed(() => getMember(store.memberId))
const reps = computed(() => reportsOf(store.memberId))
const currentReport = computed(() => (reportId.value ? reportById(store.memberId, reportId.value) : latestReport(store.memberId)))
const memberHistory = computed(() => historyOf(store.memberId))
const result = computed(() => (stage.value === 'done' ? analyzeMember(store.memberId, currentReport.value?.id) : null))

async function runParse() {
  if (!currentReport.value) { toast('请先上传或选择一份报告'); return }
  stage.value = 'parsing'
  stepState.value = STEPS.map(() => 'wait')
  for (let i = 0; i < STEPS.length; i++) {
    stepState.value[i] = 'active'
    await sleep(i === 0 ? 480 : 600)
    stepState.value[i] = 'done'
    await sleep(110)
  }
  stage.value = 'done'
  toast(`${selectedMember.value.name} 的报告已完成智能解读`)
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function onImported(report) {
  reportId.value = report.id
  stage.value = 'pick'
  importModal.value = false
}

const gaugeOption = computed(() => {
  const a = result.value
  if (!a) return {}
  return {
    title: { text: '健康评分', left: 'center', bottom: 2, textStyle: { color: '#6b7c95', fontSize: 12, fontWeight: 'normal' } },
    series: [{
      type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max: 100, radius: '94%', center: ['50%', '56%'],
      progress: { show: true, width: 15, itemStyle: { color: LEVEL_COLOR[a.overallLevel.key] } },
      axisLine: { lineStyle: { width: 15, color: [[1, '#eef2f8']] } },
      pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      anchor: { show: false },
      detail: { valueAnimation: true, offsetCenter: [0, '-2%'], fontSize: 40, fontWeight: 'bolder', formatter: '{value}', color: '#0f1b2d' },
      data: [{ value: a.healthScore, name: '健康评分' }]
    }]
  }
})

const radarOption = computed(() => {
  const a = result.value
  if (!a) return {}
  return {
    tooltip: {},
    radar: {
      indicator: a.systems.map(s => ({ name: s.name, max: 100 })),
      radius: '66%', center: ['50%', '54%'],
      splitLine: { lineStyle: { color: '#e8eef7' } },
      splitArea: { areaStyle: { color: ['#fbfdff', '#f3f7fc'] } },
      axisName: { color: '#6b7c95', fontSize: 11 }
    },
    series: [{
      type: 'radar',
      data: [{
        value: a.systems.map(s => s.risk), name: '系统风险指数',
        areaStyle: { color: 'rgba(229,72,77,0.16)' }, lineStyle: { color: '#e5484d', width: 2 }, itemStyle: { color: '#e5484d' }
      }]
    }]
  }
})

function trendOption(code) {
  const series = memberHistory.value[code]
  if (!series || series.length < 2) return null
  const meta = result.value.items.find(i => i.code === code)
  return {
    grid: { left: 6, right: 12, top: 20, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: series.map(s => s.y + '年'), axisLine: { lineStyle: { color: '#e3e9f2' } }, axisTick: { show: false }, axisLabel: { color: '#6b7c95', fontSize: 11 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f8' } }, axisLabel: { color: '#9aa9bf', fontSize: 11 }, scale: true },
    series: [{
      type: 'line', smooth: true, symbolSize: 7,
      data: series.map(s => s.v),
      lineStyle: { color: '#0e9f8e', width: 3 }, itemStyle: { color: '#0e9f8e' },
      areaStyle: { color: 'rgba(14,159,142,0.12)' },
      markLine: meta ? { silent: true, symbol: 'none', lineStyle: { color: '#e0900b', type: 'dashed' }, data: [{ yAxis: meta.ref[1], label: { formatter: '上限' } }] } : undefined
    }]
  }
}

const abnormalItems = computed(() => (result.value ? result.value.abnormal : []))
const normalItems = computed(() => (result.value ? result.value.items.filter(i => i.status === 'normal') : []))
const showNormal = ref(false)
function openDetail(item) { detail.value = item }
function doPrint() { if (typeof window !== 'undefined') window.print() }

const llmReady = computed(() => isLlmReady(store.settings))
const llmText = ref('')
const llmLoading = ref(false)
const llmError = ref('')
const defAdvice = computed(() => (result.value ? reportAdvice(result.value, selectedMember.value) : null))

watch([() => store.memberId, reportId], () => { llmText.value = ''; llmError.value = '' })

async function genLlm() {
  if (!result.value || llmLoading.value) return
  llmLoading.value = true
  llmError.value = ''
  try {
    llmText.value = await generateReportAdvice(store.settings, selectedMember.value, result.value)
  } catch (e) {
    llmError.value = '生成失败：' + (e.message || '未知错误')
  } finally {
    llmLoading.value = false
  }
}
</script>

<template>
  <div>
    <!-- ============ 选择成员与报告 ============ -->
    <template v-if="stage === 'pick'">
      <div v-if="!store.members.length" class="card card-pad">
        <div class="empty">还没有家庭成员，请先到「家庭成员档案」添加成员</div>
      </div>

      <template v-else>
        <div class="card card-pad" style="margin-bottom:18px">
          <div class="card-head">
            <div class="card-title">第一步 · 选择成员与报告</div>
            <div class="card-sub">可上传自己的体检报告，也可以直接使用内置样例</div>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <button v-for="m in store.members" :key="m.id" class="btn sm" :class="{ primary: store.memberId === m.id }" @click="store.memberId = m.id">
              {{ m.role }} · {{ m.name }}
            </button>
          </div>

          <div class="hr"></div>

          <div style="display:flex;align-items:center;margin-bottom:12px">
            <div style="font-size:13px;font-weight:600">{{ selectedMember.name }} 的报告（{{ reps.length }} 份）</div>
            <div style="flex:1"></div>
            <button class="btn sm primary" @click="importModal = true"><Icon name="upload" :size="14" style="vertical-align:-2px" /> 上传 / 录入报告</button>
          </div>

          <div v-if="reps.length" class="sample-grid">
            <button v-for="r in reps" :key="r.id" class="sample-card" :class="{ on: reportId === r.id }" @click="reportId = r.id">
              <div style="display:flex;align-items:center;gap:8px">
                <Icon name="scan" :size="18" style="color:var(--brand)" />
                <div style="font-weight:700;font-size:13.5px">{{ r.date }}</div>
                <span v-if="r.partial" class="pill grey">趋势</span>
              </div>
              <div class="muted" style="font-size:11.5px;line-height:1.7;margin-top:8px">
                {{ r.type }}<br />{{ r.org }}<br />{{ Object.keys(r.items).length }} 项指标 · {{ r.source }}
              </div>
            </button>
          </div>
          <div v-else class="empty">该成员暂无报告，请点击右上角「上传 / 录入报告」</div>

          <div style="margin-top:18px;display:flex;align-items:center;gap:12px">
            <button class="btn primary" :disabled="!currentReport" @click="runParse">开始 AI 智能解析</button>
            <span v-if="currentReport" class="muted" style="font-size:12.5px">已选择：{{ currentReport.date }} · {{ currentReport.type }}</span>
          </div>
        </div>

        <div class="card card-pad">
          <div class="card-title" style="font-size:14px;margin-bottom:6px">支持哪些导入方式</div>
          <div class="grid g-3" style="gap:12px">
            <div class="sample-card"><b style="font-size:13.5px">图片 / 拍照</b><div class="muted" style="font-size:12px;margin-top:6px;line-height:1.7">上传体检报告照片，内置 OCR 自动识别文字与数值</div></div>
            <div class="sample-card"><b style="font-size:13.5px">PDF / 文本 / CSV</b><div class="muted" style="font-size:12px;margin-top:6px;line-height:1.7">解析 PDF 文本层，或直接从体检系统复制文字、粘贴导入</div></div>
            <div class="sample-card"><b style="font-size:13.5px">手动录入</b><div class="muted" style="font-size:12px;margin-top:6px;line-height:1.7">从指标目录中选择并填写数值，适合少量指标或 OCR 纠错</div></div>
          </div>
        </div>
      </template>
    </template>

    <!-- ============ 解析中 ============ -->
    <template v-else-if="stage === 'parsing'">
      <div class="card card-pad" style="max-width:820px;margin:20px auto">
        <div class="card-head">
          <div class="card-title">AI 正在解读 {{ selectedMember.name }} 的体检报告</div>
          <div class="spacer"></div>
          <span class="pill brand">感知 → 推理 → 决策</span>
        </div>
        <div class="pipeline" style="margin-top:14px">
          <div v-for="(s, i) in STEPS" :key="i" class="pipe-step">
            <div class="pipe-rail">
              <div class="pipe-dot" :class="{ done: stepState[i] === 'done', active: stepState[i] === 'active' }">
                <Icon v-if="stepState[i] === 'done'" name="check" :size="15" />
                <template v-else>{{ i + 1 }}</template>
              </div>
              <div v-if="i < STEPS.length - 1" class="pipe-line" :class="{ done: stepState[i] === 'done' }"></div>
            </div>
            <div class="pipe-body">
              <div style="display:flex;align-items:center;gap:8px">
                <span class="pipe-name">{{ s.name }}</span>
                <span class="pill grey">{{ s.phase }}</span>
              </div>
              <div class="pipe-desc">{{ s.desc }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ 结果 ============ -->
    <template v-else-if="result">
      <div class="card card-pad" style="margin-bottom:18px">
        <div style="display:flex;gap:26px;align-items:center;flex-wrap:wrap">
          <div style="width:190px;flex:none"><ChartBox :option="gaugeOption" height="160px" /></div>
          <div style="flex:1;min-width:280px">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar-circle" :style="{ background: selectedMember.color }">{{ selectedMember.avatar }}</div>
              <div>
                <div style="font-weight:700;font-size:16px">{{ selectedMember.name }}
                  <span :class="pill(result.overallLevel.key)" style="margin-left:6px">{{ result.overallLevel.label }}</span>
                </div>
                <div class="muted" style="font-size:12px;margin-top:2px">{{ selectedMember.sex }} · {{ selectedMember.age }}岁 · {{ currentReport.org }} · {{ currentReport.date }}</div>
              </div>
            </div>
            <div style="margin-top:14px;font-size:13.5px;line-height:1.85;color:var(--ink-2)">{{ result.summary }}</div>
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
              <span class="pill warn">{{ result.abnormalCount }} 项异常</span>
              <span class="pill danger">{{ result.systemCount }} 个系统需干预</span>
              <span v-if="result.criticalAlerts.length" class="pill crit">{{ result.criticalAlerts.length }} 条危急值</span>
            </div>
            <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn" @click="stage = 'pick'">重新选择报告</button>
              <button class="btn" @click="importModal = true">上传新报告</button>
              <button class="btn" @click="setView('actions')">加入行动计划</button>
              <button class="btn primary" @click="doPrint">导出报告</button>
            </div>
          </div>
        </div>
      </div>

      <div class="split-even" style="margin-bottom:20px">
        <div class="card card-pad">
          <div class="card-head"><div class="card-title">器官系统风险</div><div class="card-sub">风险指数 0–100</div></div>
          <ChartBox :option="radarOption" height="264px" />
        </div>
        <div class="card card-pad">
          <div class="card-head"><div class="card-title">AI 推理链</div><div class="card-sub">多指标交叉推理，而非单指标阈值告警</div></div>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div v-for="(r, i) in result.reasoning" :key="i" style="border:1px solid var(--line);border-radius:12px;padding:13px 15px" :style="{ borderLeft: '4px solid ' + LEVEL_COLOR[r.level] }">
              <div style="display:flex;align-items:center;gap:8px">
                <b style="font-size:13.5px">{{ r.title }}</b>
                <span :class="pill(r.level)">{{ { high: '高', mid: '中', watch: '关注', good: '良好' }[r.level] }}</span>
              </div>
              <div style="margin:9px 0;display:flex;flex-wrap:wrap;gap:6px">
                <template v-for="(c, j) in r.chain" :key="j">
                  <span class="tag">{{ c }}</span>
                  <span v-if="j < r.chain.length - 1" class="muted" style="font-size:11px;line-height:22px">→</span>
                </template>
              </div>
              <div style="font-size:12.5px;color:var(--ink-2);line-height:1.7">{{ r.conclusion }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:18px">
        <div class="card-head">
          <div class="card-title">异常指标明细</div>
          <div class="card-sub">点击任意指标查看临床意义、趋势与干预建议</div>
          <div class="spacer"></div>
          <span class="pill warn">{{ abnormalItems.length }} 项</span>
        </div>
        <div class="ind-row head"><div>指标名称</div><div>检测值</div><div>参考区间</div><div>状态</div><div>偏离度</div></div>
        <div v-for="it in abnormalItems" :key="it.code" class="ind-row" @click="openDetail(it)">
          <div><span class="ind-name">{{ it.name }}</span><span class="ind-en">{{ it.en }}</span></div>
          <div class="ind-val" :style="{ color: it.status === 'crit' ? 'var(--crit)' : 'var(--danger)' }">{{ it.value }}<span class="unit">{{ it.unit }}</span></div>
          <div class="muted mono" style="font-size:12.5px">{{ it.ref[0] }} – {{ it.ref[1] }}</div>
          <div><span :class="statusPill(it.status)">{{ STATUS_TEXT[it.status] }}</span></div>
          <div><div class="ind-bar"><i :style="{ width: Math.min(100, Math.round(it.burden * 70)) + '%', background: it.status === 'crit' ? 'var(--crit)' : 'var(--danger)' }"></i></div></div>
        </div>
        <div style="margin-top:14px">
          <button class="btn sm ghost" @click="showNormal = !showNormal">{{ showNormal ? '收起' : '展开' }}正常指标（{{ normalItems.length }} 项）</button>
        </div>
        <div v-if="showNormal" style="margin-top:10px">
          <div v-for="it in normalItems" :key="it.code" class="ind-row" @click="openDetail(it)">
            <div><span class="ind-name">{{ it.name }}</span><span class="ind-en">{{ it.en }}</span></div>
            <div class="ind-val">{{ it.value }}<span class="unit">{{ it.unit }}</span></div>
            <div class="muted mono" style="font-size:12.5px">{{ it.ref[0] }} – {{ it.ref[1] }}</div>
            <div><span class="pill ok">正常</span></div>
            <div><div class="ind-bar"><i style="width:8%;background:var(--ok)"></i></div></div>
          </div>
        </div>
      </div>

      <div class="grid g-2" style="margin-bottom:18px">
        <div class="card card-pad">
          <div class="card-head"><div class="card-title">决策 · 复查与就医计划</div></div>
          <div v-if="result.department" style="margin-bottom:12px"><span class="pill blue">建议就诊科室：{{ result.department }}</span></div>
          <div class="timeline">
            <div v-for="(f, i) in result.followUp" :key="i" class="tl-item" :class="f.includes('危急') ? 'warn' : ''">
              <div style="font-size:13px;line-height:1.7">{{ f }}</div>
            </div>
          </div>
        </div>
        <div class="card card-pad">
          <div class="card-head"><div class="card-title">决策 · 生活方式干预</div></div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div v-for="(l, i) in result.lifestyle" :key="i" style="display:flex;gap:10px;align-items:flex-start;background:var(--surface-soft);border:1px solid var(--line);border-radius:11px;padding:11px 13px">
              <span style="color:var(--brand);flex:none;margin-top:1px"><Icon name="check" :size="16" /></span>
              <span style="font-size:13px;line-height:1.7">{{ l }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="result.insights.length" class="card card-pad" style="margin-bottom:18px">
        <div class="card-head"><div class="card-title">趋势洞察</div><div class="card-sub">跨年度指标变化，AI 识别正在恶化的信号</div></div>
        <div class="grid g-3" style="gap:14px">
          <div v-for="ins in result.insights" :key="ins.code" class="card" style="padding:14px;border:1px solid var(--line)">
            <div style="display:flex;align-items:center;gap:8px">
              <b style="font-size:13.5px">{{ ins.name }}</b>
              <span :class="ins.bad ? 'pill danger' : 'pill ok'">{{ ins.up ? '↑' : '↓' }} {{ Math.abs(ins.pct) }}%</span>
            </div>
            <div style="font-size:12px;color:var(--ink-2);line-height:1.7;margin:8px 0 4px">{{ ins.text }}</div>
          </div>
        </div>
      </div>

      <div class="card card-pad" style="margin-bottom:18px">
        <div class="card-head">
          <div class="card-title">AI 深度建议</div>
          <div class="card-sub">{{ llmReady ? '由大模型基于本报告数据生成' : '本地规则引擎（可在设置中开启大模型增强）' }}</div>
          <div class="spacer"></div>
          <span :class="llmReady ? 'pill violet' : 'pill brand'">
            <Icon :name="llmReady ? 'spark' : 'cpu'" :size="12" style="vertical-align:-2px;margin-right:3px" />{{ llmReady ? '大模型增强' : '本地规则引擎' }}
          </span>
          <button v-if="llmReady" class="btn sm primary" style="margin-left:8px" :disabled="llmLoading" @click="genLlm">
            {{ llmLoading ? '生成中…' : (llmText ? '重新生成' : '大模型深度解读') }}
          </button>
          <button v-else class="btn sm" style="margin-left:8px" @click="store.settingsOpen = true">开启大模型</button>
        </div>

        <div v-if="llmError" class="pill danger" style="margin-bottom:10px">{{ llmError }}</div>

        <div v-if="llmText" style="white-space:pre-line;font-size:13px;line-height:1.95;color:var(--ink-2)">{{ llmText }}</div>

        <div v-else-if="defAdvice">
          <div v-if="defAdvice.redFlags.length" style="margin-bottom:12px">
            <div v-for="(r, i) in defAdvice.redFlags" :key="i" class="pill crit" style="margin-right:6px;margin-bottom:6px">{{ r }}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div v-for="(p, i) in defAdvice.priority" :key="i" style="border:1px solid var(--line);border-left:4px solid" :style="{ borderLeftColor: LEVEL_COLOR[p.level] }" :class="'card-pad'">
              <div style="font-weight:700;font-size:13.5px">{{ i + 1 }}. {{ p.title }}</div>
              <div style="font-size:12.5px;color:var(--ink-2);line-height:1.75;margin-top:5px">{{ p.detail }}</div>
            </div>
          </div>
          <div v-if="defAdvice.notes.length" style="margin-top:12px;background:var(--surface-soft);border:1px solid var(--line);border-radius:12px;padding:12px 14px">
            <div style="font-weight:700;font-size:13px;margin-bottom:6px">个体化提醒</div>
            <div v-for="(n, i) in defAdvice.notes" :key="i" style="font-size:12.5px;color:var(--ink-2);line-height:1.8">· {{ n }}</div>
          </div>
        </div>
      </div>

      <div class="disclaimer">
        本报告由明检 MedClear 基于公开医学参考区间与知识规则自动生成，仅用于健康科普与就医参考，不能替代执业医师的诊断与治疗建议。请以医疗机构正式报告与医生意见为准。{{ llmReady ? ' 启用大模型时，深度建议由大模型基于你的数据生成。' : '' }}
      </div>
    </template>

    <!-- ============ 指标详情抽屉 ============ -->
    <transition name="fade">
      <div v-if="detail" style="position:fixed;inset:0;background:rgba(15,27,45,0.32);z-index:80" @click.self="detail = null">
        <div style="position:absolute;right:0;top:0;bottom:0;width:440px;max-width:92vw;background:#fff;box-shadow:var(--shadow-lg);padding:24px;overflow-y:auto">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
            <b style="font-size:17px">{{ detail.name }}</b>
            <span class="muted" style="font-size:12px">{{ detail.en }}</span>
            <div style="flex:1"></div>
            <button class="btn sm" @click="detail = null">关闭</button>
          </div>
          <div style="margin:14px 0;display:flex;align-items:baseline;gap:10px">
            <span style="font-size:34px;font-weight:800;font-variant-numeric:tabular-nums" :style="{ color: detail.status === 'normal' ? 'var(--ok)' : 'var(--danger)' }">{{ detail.value }}</span>
            <span class="muted">{{ detail.unit }}</span>
            <span :class="statusPill(detail.status)">{{ STATUS_TEXT[detail.status] }}</span>
          </div>
          <div class="muted" style="font-size:12.5px;margin-bottom:16px">参考区间：{{ detail.ref[0] }} – {{ detail.ref[1] }} {{ detail.unit }}</div>
          <div class="card-pad" style="background:var(--surface-soft);border-radius:12px;border:1px solid var(--line)">
            <div style="font-weight:700;font-size:13.5px;margin-bottom:6px">指标意义</div>
            <div style="font-size:13px;line-height:1.75;color:var(--ink-2)">{{ detail.meaning }}</div>
            <div style="font-weight:700;font-size:13.5px;margin:14px 0 6px">结果解读</div>
            <div style="font-size:13px;line-height:1.75;color:var(--ink-2)">{{ detail.deviation || '本次结果处于参考区间内。' }}</div>
            <div style="font-weight:700;font-size:13.5px;margin:14px 0 6px">干预建议</div>
            <div style="font-size:13px;line-height:1.75;color:var(--ink-2)">{{ detail.advice || '保持健康生活方式。' }}</div>
          </div>
          <div v-if="trendOption(detail.code)" style="margin-top:18px">
            <div style="font-weight:700;font-size:13.5px;margin-bottom:6px">历年趋势</div>
            <ChartBox :option="trendOption(detail.code)" height="200px" />
          </div>
        </div>
      </div>
    </transition>

    <ReportImportModal v-if="importModal" :member-id="store.memberId" @close="importModal = false" @saved="onImported" />
  </div>
</template>

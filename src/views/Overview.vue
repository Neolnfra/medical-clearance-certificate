<script setup>
import { computed } from 'vue'
import { SYSTEMS } from '../data/health.js'
import { store, setView, analyzeMember } from '../store.js'
import { pill, LEVEL_COLOR, riskColor, riskBg } from '../utils.js'
import ChartBox from '../components/ChartBox.vue'
import Icon from '../components/Icon.vue'

const rows = computed(() => store.members.map(m => ({ member: m, a: analyzeMember(m.id) })).filter(r => r.a))
const memberCount = computed(() => store.members.length)

const totals = computed(() => ({
  members: memberCount.value,
  abnormal: rows.value.reduce((s, r) => s + r.a.abnormalCount, 0),
  watch: rows.value.reduce((s, r) => s + r.a.systemCount, 0),
  critical: rows.value.reduce((s, r) => s + r.a.criticalAlerts.length, 0)
}))

const barOption = computed(() => ({
  grid: { left: 6, right: 10, top: 34, bottom: 4, containLabel: true },
  tooltip: { trigger: 'axis', valueFormatter: v => v + ' 分' },
  xAxis: { type: 'category', data: rows.value.map(r => r.member.role), axisLine: { lineStyle: { color: '#e3e9f2' } }, axisTick: { show: false }, axisLabel: { color: '#6b7c95', fontSize: 12 } },
  yAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: '#eef2f8' } }, axisLabel: { color: '#9aa9bf', fontSize: 11 } },
  series: [{
    type: 'bar', barWidth: 38,
    data: rows.value.map(r => ({ value: r.a.healthScore, itemStyle: { color: LEVEL_COLOR[r.a.overallLevel.key], borderRadius: [8, 8, 0, 0] } })),
    label: { show: true, position: 'top', formatter: '{c}', color: '#0f1b2d', fontWeight: 'bold', fontSize: 12 }
  }]
}))

const alerts = computed(() => {
  const list = []
  rows.value.forEach(r => {
    r.a.abnormal.filter(i => i.status === 'crit' || i.status === 'high').forEach(i => list.push({ member: r.member, item: i }))
  })
  const rank = { crit: 0, high: 1 }
  return list.sort((a, b) => rank[a.item.status] - rank[b.item.status] || b.item.burden - a.item.burden).slice(0, 6)
})

const worst = computed(() => [...rows.value].sort((a, b) => b.a.overallRisk - a.a.overallRisk)[0] || null)

function openMember(id, view = 'analyze') { store.memberId = id; setView(view) }
</script>

<template>
  <div>
    <div class="grid g-4" style="margin-bottom:18px">
      <div class="card stat">
        <div class="stat-label"><Icon name="users" :size="15" /> 建档家庭成员</div>
        <div class="stat-value">{{ totals.members }}<small>人</small></div>
        <div class="stat-foot">可在「家庭成员档案」中自由增删改</div>
      </div>
      <div class="card stat">
        <div class="stat-label"><Icon name="activity" :size="15" /> 累计异常指标</div>
        <div class="stat-value" style="color:var(--warn)">{{ totals.abnormal }}<small>项</small></div>
        <div class="stat-foot">AI 已逐项完成参考区间比对</div>
      </div>
      <div class="card stat">
        <div class="stat-label"><Icon name="layers" :size="15" /> 需干预系统数</div>
        <div class="stat-value" style="color:var(--danger)">{{ totals.watch }}<small>项</small></div>
        <div class="stat-foot">器官系统风险达到中风险及以上</div>
      </div>
      <div class="card stat">
        <div class="stat-label"><Icon name="alert" :size="15" /> 危急值提醒</div>
        <div class="stat-value" :style="{ color: totals.critical ? 'var(--crit)' : 'var(--ok)' }">{{ totals.critical }}<small>条</small></div>
        <div class="stat-foot">需尽快复核就医的指标</div>
      </div>
    </div>

    <div v-if="!rows.length" class="card card-pad" style="margin-bottom:18px">
      <div class="empty">还没有任何家庭成员，请先到「家庭成员档案」添加成员并上传体检报告</div>
    </div>

    <template v-else>
      <div class="split-main" style="margin-bottom:20px">
        <div class="card card-pad">
          <div class="card-head">
            <div class="card-title">家庭成员健康评分</div>
            <div class="card-sub">健康评分 = 100 − 综合风险指数</div>
          </div>
          <div class="grid g-4" style="gap:10px;margin-bottom:14px">
            <button v-for="r in rows" :key="r.member.id" class="sample-card" style="padding:12px" @click="openMember(r.member.id, 'members')">
              <div style="display:flex;align-items:center;gap:9px">
                <div class="avatar-circle" :style="{ background: r.member.color, width: '34px', height: '34px', fontSize: '14px' }">{{ r.member.avatar }}</div>
                <div style="min-width:0">
                  <div style="font-weight:700;font-size:13.5px">{{ r.member.role }}</div>
                  <div class="muted" style="font-size:11px">{{ r.member.age }}岁 · {{ r.member.sex }}</div>
                </div>
              </div>
              <div style="display:flex;align-items:baseline;gap:6px;margin-top:10px">
                <span style="font-size:26px;font-weight:800;font-variant-numeric:tabular-nums">{{ r.a.healthScore }}</span>
                <span :class="pill(r.a.overallLevel.key)">{{ r.a.overallLevel.label }}</span>
              </div>
              <div class="muted" style="font-size:11px;margin-top:6px">{{ r.a.abnormalCount }} 项异常 · {{ r.a.systemCount }} 个系统需干预</div>
            </button>
          </div>
          <ChartBox :option="barOption" height="212px" />
        </div>

        <div class="card card-pad">
          <div class="card-head">
            <div class="card-title">器官系统风险矩阵</div>
            <div class="card-sub">数值越高风险越高</div>
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:separate;border-spacing:5px;font-size:12px">
              <thead>
                <tr>
                  <th style="text-align:left;color:var(--dim);font-weight:600;padding-left:4px">成员</th>
                  <th v-for="s in SYSTEMS" :key="s.key" style="color:var(--dim);font-weight:600">{{ s.name }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in rows" :key="r.member.id">
                  <td style="font-weight:600;white-space:nowrap;padding-left:4px">{{ r.member.role }}</td>
                  <td v-for="s in r.a.systems" :key="s.key" :style="{ background: riskBg(s.risk), color: riskColor(s.risk), borderRadius: '9px', textAlign: 'center', padding: '9px 4px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }">
                    {{ s.risk }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="legend" style="margin-top:14px">
            <span><i style="background:#17a673"></i>良好</span>
            <span><i style="background:#2f6bff"></i>需关注</span>
            <span><i style="background:#e0900b"></i>中风险</span>
            <span><i style="background:#e5484d"></i>高风险</span>
            <span><i style="background:#b42318"></i>极高</span>
          </div>
          <hr class="hr" />
          <div class="card-title" style="font-size:13px;margin-bottom:8px">AI 家庭健康洞察</div>
          <div v-if="worst" style="font-size:12.5px;line-height:1.8;color:var(--ink-2)">
            当前风险最高的是{{ worst.member.role }}（{{ worst.member.name }}），综合风险指数 {{ worst.a.overallRisk }}/100（{{ worst.a.overallLevel.label }}），需优先干预{{ worst.a.systems.filter(s => s.risk >= 40).map(s => s.name).join('、') || '相关系统' }}。建议按「复查与行动计划」分优先级推进。
          </div>
        </div>
      </div>

      <div class="card card-pad">
        <div class="card-head">
          <div class="card-title">重点风险提示</div>
          <div class="card-sub">按严重程度排序，点击查看报告解读</div>
          <div class="spacer"></div>
          <span class="pill danger">{{ alerts.length }} 项待关注</span>
        </div>
        <div v-if="alerts.length" class="grid g-3" style="gap:12px">
          <div v-for="(al, i) in alerts" :key="i" class="sample-card" @click="openMember(al.member.id)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span class="avatar-circle" :style="{ background: al.member.color, width: '26px', height: '26px', fontSize: '12px' }">{{ al.member.avatar }}</span>
              <span :class="al.item.status === 'crit' ? 'pill crit' : 'pill warn'">{{ al.item.status === 'crit' ? '危急' : '偏高' }}</span>
              <span class="muted" style="font-size:11.5px">{{ al.member.role }}</span>
            </div>
            <div style="font-weight:700;font-size:13.5px">{{ al.item.name }} <span class="muted" style="font-weight:500">{{ al.item.en }}</span></div>
            <div style="margin-top:4px;font-size:13px">
              <b style="font-variant-numeric:tabular-nums;font-size:16px">{{ al.item.value }}</b>
              <span class="muted"> {{ al.item.unit }}</span>
              <span class="muted" style="font-size:11.5px;margin-left:6px">参考 {{ al.item.ref[0] }}–{{ al.item.ref[1] }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty">当前没有需要重点关注的风险项</div>
      </div>
    </template>
  </div>
</template>

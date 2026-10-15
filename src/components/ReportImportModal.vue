<script setup>
import { ref, computed } from 'vue'
import { CATALOG } from '../data/catalog.js'
import { INDICATORS } from '../data/health.js'
import { parseText, parseReport } from '../engine/parser.js'
import { ocrImage, pdfToText, readTextFile } from '../engine/ingest.js'
import { upsertReport, toast, getMember } from '../store.js'
import Icon from './Icon.vue'

const props = defineProps({ memberId: { type: String, required: true } })
const emit = defineEmits(['close', 'saved'])

const today = new Date().toISOString().slice(0, 10)
const tab = ref('file')
const busy = ref(false)
const progress = ref('')
const rows = ref([])
const pasteText = ref('')
const manualCode = ref('')
const manualValue = ref('')
const search = ref('')
const meta = ref({ date: today, org: '', type: '体检报告', source: '用户上传' })
const matched = ref(null)

const member = computed(() => getMember(props.memberId))
const filteredCatalog = computed(() => {
  const q = search.value.trim().toLowerCase()
  return (q ? CATALOG.filter(c => c.name.includes(q) || c.en.toLowerCase().includes(q)) : CATALOG).slice(0, 60)
})

function setRows(items) {
  rows.value = Object.entries(items).map(([code, value]) => ({ code, value }))
  matched.value = rows.value.length
  if (rows.value.length) toast(`已识别 ${rows.value.length} 项指标，请核对后保存`)
  else toast('未识别到指标，可切换到「手动录入」')
}

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  busy.value = true
  progress.value = '正在读取文件…'
  try {
    let text = ''
    const name = file.name.toLowerCase()
    if (/\.(png|jpe?g|webp|bmp|gif)$/.test(name) || file.type.startsWith('image/')) {
      progress.value = '正在加载 OCR 引擎…'
      text = await ocrImage(file, m => {
        progress.value = `OCR 识别中：${m.status}${m.progress ? ' ' + Math.round(m.progress * 100) + '%' : ''}`
      })
    } else if (name.endsWith('.pdf')) {
      progress.value = '正在解析 PDF 文本…'
      text = await pdfToText(file)
      if (!text.trim()) { progress.value = ''; busy.value = false; toast('该 PDF 无可提取文本（可能为扫描件），请改用「手动录入」'); return }
    } else {
      progress.value = '正在读取文本…'
      text = await readTextFile(file)
    }
    meta.value.source = '用户上传 · ' + file.name
    meta.value.fileName = file.name
    setRows(parseReport(text, file.name).items)
  } catch (err) {
    toast('文件解析失败：' + (err.message || '未知错误') + '，可改用「粘贴文本」或「手动录入」')
  } finally {
    busy.value = false
    progress.value = ''
    e.target.value = ''
  }
}

function doParsePaste() {
  if (!pasteText.value.trim()) { toast('请先粘贴报告内容'); return }
  setRows(parseText(pasteText.value).items)
}

function addManual() {
  if (!manualCode.value) { toast('请选择指标'); return }
  if (manualValue.value === '' || Number.isNaN(Number(manualValue.value))) { toast('请输入有效数值'); return }
  const exist = rows.value.find(r => r.code === manualCode.value)
  if (exist) exist.value = Number(manualValue.value)
  else rows.value.push({ code: manualCode.value, value: Number(manualValue.value) })
  search.value = ''
  manualCode.value = ''
  manualValue.value = ''
}

function removeRow(i) { rows.value.splice(i, 1) }
function codeName(code) { return INDICATORS[code]?.name || code }
function codeUnit(code) { return INDICATORS[code]?.unit || '' }

function save() {
  const items = {}
  rows.value.forEach(r => {
    const v = Number(r.value)
    if (r.code && r.value !== '' && !Number.isNaN(v)) items[r.code] = v
  })
  if (!Object.keys(items).length) { toast('请至少录入一项有效指标'); return }
  if (!meta.value.date) { toast('请填写报告日期'); return }
  const report = {
    id: 'R' + Date.now(),
    date: meta.value.date,
    org: meta.value.org || '用户录入',
    type: meta.value.type || '体检报告',
    items,
    source: meta.value.source,
    fileName: meta.value.fileName || ''
  }
  upsertReport(props.memberId, report)
  toast(`已为${member.value?.name || '成员'}保存报告并完成解读`)
  emit('saved', report)
  emit('close')
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card wide">
      <div class="modal-head">
        <div class="modal-title">上传 / 录入体检报告</div>
        <span class="pill brand">{{ member?.name }} · {{ member?.role }}</span>
        <div style="flex:1"></div>
        <button class="btn sm ghost" @click="emit('close')">关闭</button>
      </div>
      <div class="modal-body">

        <!-- tabs -->
        <div style="display:flex;gap:8px;margin:18px 0 16px">
          <button class="btn sm" :class="{ primary: tab === 'file' }" @click="tab = 'file'">文件上传</button>
          <button class="btn sm" :class="{ primary: tab === 'paste' }" @click="tab = 'paste'">粘贴文本</button>
          <button class="btn sm" :class="{ primary: tab === 'manual' }" @click="tab = 'manual'">手动录入</button>
        </div>

        <!-- file -->
        <div v-if="tab === 'file'">
          <label class="upload-zone" style="display:block;cursor:pointer">
            <input type="file" accept="image/*,.pdf,.csv,.txt,.json" style="display:none" @change="onFile" />
            <div style="display:flex;justify-content:center;color:var(--brand);margin-bottom:8px"><Icon name="upload" :size="30" /></div>
            <div style="font-weight:700;font-size:14.5px">{{ busy ? '正在解析…' : '点击选择体检报告文件' }}</div>
            <div class="muted" style="font-size:12px;margin-top:6px">支持图片（OCR 识别）、PDF、CSV、TXT、JSON</div>
            <div v-if="progress" class="pill blue" style="margin-top:10px">{{ progress }}</div>
          </label>
        </div>

        <!-- paste -->
        <div v-else-if="tab === 'paste'">
          <textarea v-model="pasteText" class="field" rows="7"
            placeholder="将从体检报告或体检系统复制的文字粘贴到这里，例如：&#10;谷丙转氨酶 62 U/L 9-50&#10;甘油三酯 2.4 mmol/L 0.45-1.7&#10;LDL-C: 3.8"></textarea>
          <div style="margin-top:10px"><button class="btn primary sm" @click="doParsePaste">解析文本</button></div>
        </div>

        <!-- manual -->
        <div v-else>
          <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
            <label style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:6px">
              <span style="font-size:12.5px;font-weight:600">搜索指标</span>
              <input v-model="search" class="field" placeholder="输入指标中文名或英文缩写" />
            </label>
            <label style="min-width:220px;display:flex;flex-direction:column;gap:6px">
              <span style="font-size:12.5px;font-weight:600">选择指标</span>
              <select v-model="manualCode" class="field">
                <option value="">请选择</option>
                <option v-for="c in filteredCatalog" :key="c.code" :value="c.code">{{ c.name }}（{{ c.en }}）</option>
              </select>
            </label>
            <label style="width:130px;display:flex;flex-direction:column;gap:6px">
              <span style="font-size:12.5px;font-weight:600">数值</span>
              <input v-model="manualValue" class="field" type="number" step="0.01" placeholder="数值" />
            </label>
            <button class="btn primary" @click="addManual">添加</button>
          </div>
        </div>

        <!-- 解析结果 -->
        <div v-if="rows.length || matched !== null" style="margin-top:20px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <div class="card-title" style="font-size:14px">解析结果确认</div>
            <span class="pill warn">{{ rows.length }} 项</span>
            <span class="muted" style="font-size:12px">请核对数值，可修改或删除后保存（AI 识别 + 人工确认）</span>
          </div>
          <div style="max-height:230px;overflow:auto;border:1px solid var(--line);border-radius:12px">
            <div v-for="(r, i) in rows" :key="r.code" style="display:flex;align-items:center;gap:10px;padding:9px 13px" :style="{ borderTop: i ? '1px solid var(--line-2)' : 'none' }">
              <div style="flex:1"><b style="font-size:13.5px">{{ codeName(r.code) }}</b> <span class="muted" style="font-size:11px">{{ r.code }}</span></div>
              <span class="muted" style="font-size:12px">{{ codeUnit(r.code) }}</span>
              <input v-model="r.value" class="field" style="width:110px" type="number" step="0.01" />
              <button class="btn sm ghost" @click="removeRow(i)">删除</button>
            </div>
            <div v-if="!rows.length" class="empty" style="padding:20px">暂无指标，请从上方录入</div>
          </div>
        </div>

        <!-- 报告信息 -->
        <div style="margin-top:18px;display:flex;gap:12px;flex-wrap:wrap">
          <label style="width:150px;display:flex;flex-direction:column;gap:6px">
            <span style="font-size:12.5px;font-weight:600">报告日期</span>
            <input v-model="meta.date" class="field" type="date" />
          </label>
          <label style="flex:1;min-width:180px;display:flex;flex-direction:column;gap:6px">
            <span style="font-size:12.5px;font-weight:600">体检机构（选填）</span>
            <input v-model="meta.org" class="field" placeholder="如：青岛市市立医院" />
          </label>
          <label style="width:180px;display:flex;flex-direction:column;gap:6px">
            <span style="font-size:12.5px;font-weight:600">报告类型</span>
            <input v-model="meta.type" class="field" placeholder="如：职工年度体检" />
          </label>
        </div>

        <div class="disclaimer" style="margin-top:14px">
          报告数据仅保存在你本机浏览器（localStorage），不会上传到服务器。AI 解读仅用于健康科普与就医参考，不能替代医生诊断。
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn primary" :disabled="busy" @click="save">保存并解读</button>
      </div>
    </div>
  </div>
</template>

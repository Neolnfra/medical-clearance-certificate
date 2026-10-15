<script setup>
import { ref, computed } from 'vue'
import { store, toast } from '../store.js'
import { PRESETS, testConnection } from '../engine/llm.js'
import Icon from './Icon.vue'

const emit = defineEmits(['close'])
const form = ref({ ...store.settings, temperature: store.settings.temperature ?? 0.4 })
const showKey = ref(false)
const testing = ref(false)
const testMsg = ref('')
const testOk = ref(false)

const isCustom = computed(() => form.value.provider === 'custom')
const isDemo = computed(() => form.value.provider === 'demo')

function onProvider() {
  const p = PRESETS[form.value.provider]
  if (!p) return
  if (form.value.provider !== 'custom') {
    form.value.baseUrl = p.baseUrl
    form.value.model = p.model
  }
}

async function doTest() {
  testing.value = true
  testMsg.value = ''
  testOk.value = false
  try {
    const r = await testConnection(form.value)
    testMsg.value = '连接成功：' + r
    testOk.value = true
  } catch (e) {
    testMsg.value = '连接失败：' + (e.message || '未知错误')
    testOk.value = false
  } finally {
    testing.value = false
  }
}

function save() {
  store.settings = { ...store.settings, ...form.value }
  toast(form.value.llmEnabled ? '已启用大模型增强' : '已切换为本地规则引擎')
  emit('close')
}
function clearKey() {
  form.value.apiKey = ''
  store.settings = { ...store.settings, apiKey: '' }
  toast('已清除本地保存的密钥')
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-head">
        <Icon name="settings" :size="18" style="color:var(--brand)" />
        <div class="modal-title">设置 · 回答建议引擎</div>
        <div style="flex:1"></div>
        <button class="btn sm ghost" @click="emit('close')">关闭</button>
      </div>

      <div class="modal-body">
        <div style="display:flex;align-items:center;gap:14px;border:1px solid var(--line);border-radius:var(--radius);padding:16px;background:var(--surface-soft)">
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px">启用大模型增强</div>
            <div class="muted" style="font-size:12px;margin-top:4px;line-height:1.65">
              开启后，AI 健康助手与报告深度建议由大模型基于你的数据生成；关闭时使用本地规则引擎（离线可用、数据不出本机）。
            </div>
          </div>
          <button class="switch" :class="{ on: form.llmEnabled }" @click="form.llmEnabled = !form.llmEnabled" aria-label="启用大模型">
            <span class="knob"></span>
          </button>
        </div>

        <div v-if="form.llmEnabled" style="margin-top:18px;display:flex;flex-direction:column;gap:15px">
          <label style="display:flex;flex-direction:column;gap:6px">
            <span class="form-label">服务提供方</span>
            <select v-model="form.provider" class="field" @change="onProvider">
              <option v-for="(p, k) in PRESETS" :key="k" :value="k">{{ p.name }}</option>
            </select>
          </label>

          <template v-if="!isDemo">
            <div style="display:flex;gap:12px">
              <label style="flex:2;display:flex;flex-direction:column;gap:6px">
                <span class="form-label">接口地址 Base URL</span>
                <input v-model="form.baseUrl" class="field" placeholder="https://api.openai.com/v1" :disabled="!isCustom" />
              </label>
              <label style="flex:1;display:flex;flex-direction:column;gap:6px">
                <span class="form-label">模型</span>
                <input v-model="form.model" class="field" placeholder="gpt-4o-mini" :disabled="!isCustom" />
              </label>
            </div>
            <label style="display:flex;flex-direction:column;gap:6px">
              <span class="form-label"><Icon name="lock" :size="13" style="vertical-align:-2px;margin-right:4px" />API Key</span>
              <div style="display:flex;gap:8px">
                <input v-model="form.apiKey" class="field" :type="showKey ? 'text' : 'password'" placeholder="sk-..." autocomplete="off" />
                <button class="btn sm" @click="showKey = !showKey">{{ showKey ? '隐藏' : '显示' }}</button>
                <button class="btn sm" @click="clearKey">清除</button>
              </div>
              <span class="muted" style="font-size:11.5px">密钥仅保存在你本机浏览器，不会上传到我们的服务器；调用时直接由浏览器发送至你填写的服务方。</span>
            </label>
            <label style="display:flex;flex-direction:column;gap:6px">
              <span class="form-label">温度 temperature：{{ Number(form.temperature).toFixed(1) }}</span>
              <input v-model="form.temperature" type="range" min="0" max="1" step="0.1" class="range" />
              <span class="muted" style="font-size:11.5px">数值越低回答越稳定保守，健康场景建议 0.2~0.5</span>
            </label>

            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <button class="btn" :disabled="testing" @click="doTest">
                <span v-if="testing" class="spinner"></span>{{ testing ? '测试中…' : '测试连接' }}
              </button>
              <span v-if="testMsg" :class="testOk ? 'pill ok' : 'pill danger'">{{ testMsg }}</span>
            </div>
          </template>
          <div v-else class="disclaimer">
            演示模式在本地模拟大模型输出，无需密钥即可体验“大模型增强”的回答形态；正式使用请选择具体服务商并填写密钥。
          </div>
        </div>

        <div class="disclaimer" style="margin-top:16px">
          无论启用与否，回答建议都只用于健康科普与就医参考，不能替代医生诊断。出现危急值请及时就医。
        </div>
      </div>

      <div class="modal-foot">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn primary" @click="save">保存设置</button>
      </div>
    </div>
  </div>
</template>

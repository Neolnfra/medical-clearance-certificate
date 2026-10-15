<script setup>
import { ref } from 'vue'
import { addMember, updateMember, store, toast } from '../store.js'

const props = defineProps({ member: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])

const form = ref({
  name: props.member?.name || '',
  role: props.member?.role || '',
  sex: props.member?.sex || '男',
  age: props.member?.age ?? '',
  profile: (props.member?.profile || []).join('，')
})
const roles = ['本人', '父亲', '母亲', '配偶', '儿子', '女儿', '祖父', '祖母', '外祖父', '外祖母', '家属']

function save() {
  if (!form.value.name.trim()) { toast('请填写姓名'); return }
  if (!form.value.age || Number(form.value.age) <= 0) { toast('请填写有效年龄'); return }
  const data = {
    name: form.value.name.trim(),
    role: form.value.role.trim() || '家属',
    sex: form.value.sex,
    age: Number(form.value.age),
    profile: form.value.profile.split(/[，,、\s]+/).map(s => s.trim()).filter(Boolean)
  }
  if (props.member) {
    updateMember(props.member.id, data)
    toast('成员信息已更新')
  } else {
    const m = addMember(data)
    store.memberId = m.id
    toast('已添加家庭成员')
  }
  emit('saved')
  emit('close')
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-card narrow">
      <div class="modal-head">
        <div class="modal-title">{{ member ? '编辑家庭成员' : '添加家庭成员' }}</div>
        <div style="flex:1"></div>
        <button class="btn sm ghost" @click="emit('close')">关闭</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;flex-direction:column;gap:15px">
          <label style="display:flex;flex-direction:column;gap:6px">
            <span class="form-label">姓名</span>
            <input v-model="form.name" class="field" placeholder="请输入真实姓名" />
          </label>
          <div style="display:flex;gap:12px">
            <label style="flex:1;display:flex;flex-direction:column;gap:6px">
              <span class="form-label">与本人关系</span>
              <select v-model="form.role" class="field">
                <option value="">请选择或填写</option>
                <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
              </select>
            </label>
            <label style="width:110px;display:flex;flex-direction:column;gap:6px">
              <span class="form-label">性别</span>
              <select v-model="form.sex" class="field">
                <option>男</option>
                <option>女</option>
              </select>
            </label>
            <label style="width:100px;display:flex;flex-direction:column;gap:6px">
              <span class="form-label">年龄</span>
              <input v-model="form.age" class="field" type="number" min="1" max="120" placeholder="岁" />
            </label>
          </div>
          <label style="display:flex;flex-direction:column;gap:6px">
            <span class="form-label">健康画像 / 既往史（选填）</span>
            <input v-model="form.profile" class="field" placeholder="如：高血压 8 年，吸烟史 20 年（用逗号分隔）" />
            <span class="muted" style="font-size:11.5px">用于让 AI 结合个体情况做更精准的风险判断</span>
          </label>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn" @click="emit('close')">取消</button>
        <button class="btn primary" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>

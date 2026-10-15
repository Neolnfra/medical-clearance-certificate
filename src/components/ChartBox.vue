<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '260px' }
})

const el = ref(null)
let chart = null

function render() {
  if (!chart && el.value) chart = echarts.init(el.value)
  if (chart) chart.setOption(props.option, true)
}

function resize() { chart && chart.resize() }

onMounted(async () => {
  await nextTick()
  render()
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart && chart.dispose()
})
watch(() => props.option, render)
</script>

<template>
  <div ref="el" :style="{ height, width: '100%' }"></div>
</template>

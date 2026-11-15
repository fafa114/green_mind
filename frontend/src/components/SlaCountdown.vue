<template>
  <span class="sla" :class="{ overdue: isOverdue }">{{ text }}</span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ deadline: string }>()

const now = ref(Date.now())
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => { now.value = Date.now() }, 1000)
})
onBeforeUnmount(() => clearInterval(timer))

const remainMs = computed(() => new Date(props.deadline + (props.deadline.endsWith('Z') ? '' : 'Z')).getTime() - now.value)
const isOverdue = computed(() => remainMs.value < 0)

const text = computed(() => {
  const abs = Math.abs(remainMs.value)
  const h = Math.floor(abs / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)
  const s = Math.floor((abs % 60000) / 1000)
  const t = `${h}时${m}分${s}秒`
  return isOverdue.value ? `超时 ${t}` : `剩余 ${t}`
})
</script>

<style scoped>
.sla { color: #67c23a; font-size: 12px; }
.sla.overdue { color: #f56c6c; font-weight: 700; }
</style>

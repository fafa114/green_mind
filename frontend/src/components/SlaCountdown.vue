<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = withDefaults(defineProps<{ deadline: string; closed?: boolean }>(), {
  closed: false,
})

const now = ref(Date.now())
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => {
  if (timer !== undefined) window.clearInterval(timer)
})

const remaining = computed(() => new Date(props.deadline).getTime() - now.value)
const overdue = computed(() => remaining.value < 0)
const urgent = computed(() => !overdue.value && remaining.value < 3600 * 1000)

function format(ms: number): string {
  const abs = Math.abs(ms)
  const d = Math.floor(abs / 86400000)
  const h = Math.floor((abs % 86400000) / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)
  const s = Math.floor((abs % 60000) / 1000)
  if (d > 0) return `${d}天${h}小时`
  if (h > 0) return `${h}小时${m}分`
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}

const text = computed(() => {
  if (props.closed) return '已关闭'
  return overdue.value ? `超时 ${format(remaining.value)}` : `剩余 ${format(remaining.value)}`
})
</script>

<template>
  <span class="sla" :class="{ overdue: overdue && !closed, urgent, closed }">
    <AppIcon :name="closed ? 'check' : 'gauge'" :size="13" :stroke-width="2.2" />
    <span class="gm-num">{{ text }}</span>
  </span>
</template>

<style scoped>
.sla {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  color: var(--gm-primary);
  background: var(--gm-primary-soft);
  white-space: nowrap;
}
.sla.urgent {
  color: var(--gm-amber);
  background: rgba(245, 158, 11, 0.14);
}
.sla.overdue {
  color: var(--gm-red);
  background: rgba(239, 68, 68, 0.12);
  animation: sla-blink 1.6s ease-in-out infinite;
}
.sla.closed {
  color: var(--gm-ink-faint);
  background: var(--gm-surface-3);
}
@keyframes sla-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.62; }
}
</style>
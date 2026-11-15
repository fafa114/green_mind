<template>
  <div class="metric-card" :class="{ exceed: isExceed }">
    <div class="name">{{ name }}</div>
    <div class="value">{{ displayValue }}</div>
    <div class="limit">标准 {{ limitText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  value?: number | null
  limit?: number | null
  unit?: string
  digits?: number
  active?: boolean
}>()

const displayValue = computed(() => (props.value === null || props.value === undefined) ? '--' : Number(props.value).toFixed(props.digits ?? 2))
const limitText = computed(() => (props.limit === null || props.limit === undefined) ? '--' : `${Number(props.limit).toFixed(props.digits ?? 0)}${props.unit || ''}`)
const isExceed = computed(() => props.active !== false && props.value != null && props.limit != null && props.value > props.limit)
</script>

<style scoped>
.metric-card { background: #152233; border: 1px solid #24405a; border-radius: 8px; padding: 14px 16px; min-width: 120px; }
.metric-card.exceed { border-color: #f56c6c; box-shadow: 0 0 10px rgba(245,108,108,.4) inset; }
.name { color: #7d93a8; font-size: 13px; }
.value { color: #4cc2ff; font-size: 26px; font-weight: 700; margin: 6px 0; }
.metric-card.exceed .value { color: #ff6b6b; }
.limit { color: #55708c; font-size: 12px; }
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { ALARM_LEVEL_LABEL, ALARM_LEVEL_COLOR, type AlarmLevel } from '@/api/types'

const props = defineProps<{ level: AlarmLevel }>()
const color = computed(() => ALARM_LEVEL_COLOR[props.level])
const label = computed(() => ALARM_LEVEL_LABEL[props.level])
</script>

<template>
  <span class="level-tag" :style="{ '--lt': color }">
    <span class="dot"></span>
    {{ label }}
  </span>
</template>

<style scoped>
.level-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: var(--lt);
  background: color-mix(in srgb, var(--lt) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--lt) 30%, transparent);
  white-space: nowrap;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--lt);
  box-shadow: 0 0 8px color-mix(in srgb, var(--lt) 70%, transparent);
}
</style>
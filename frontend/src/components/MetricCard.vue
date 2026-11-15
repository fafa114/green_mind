<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { formatNumber } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    label: string
    formula: string
    value: number | null
    limit: number | null
    measured?: number | null
    unit: string
    color: string
  }>(),
  { measured: null },
)

const exceed = computed(
  () => props.value != null && props.limit != null && props.limit > 0 && props.value >= props.limit,
)
const ratio = computed(() =>
  props.value != null && props.limit != null && props.limit > 0 ? props.value / props.limit : 0,
)
const barWidth = computed(() => Math.min(ratio.value, 1) * 100)
const overPct = computed(() => Math.max(0, Math.round((ratio.value - 1) * 100)))
</script>

<template>
  <div class="metric" :class="{ exceed }" :style="{ '--mc': color }">
    <span class="accent"></span>
    <div class="m-head">
      <span class="formula">{{ formula }}</span>
      <span class="m-label">{{ label }}</span>
      <span class="status" :class="{ ok: !exceed }">
        <AppIcon :name="exceed ? 'alert' : 'check'" :size="13" :stroke-width="2.4" />
        {{ exceed ? '超标' : '正常' }}
      </span>
    </div>

    <div class="m-value gm-num">
      <strong>{{ formatNumber(value) }}</strong>
      <span class="unit">{{ unit }}</span>
    </div>

    <div class="m-bar">
      <span class="m-bar-fill" :style="{ width: barWidth + '%' }"></span>
      <span class="m-bar-limit"></span>
    </div>

    <div class="m-meta gm-num">
      <span>标准 <b>{{ formatNumber(limit) }}</b></span>
      <span>实测 <b>{{ formatNumber(measured) }}</b></span>
      <span v-if="exceed" class="over">超 {{ overPct }}%</span>
    </div>
  </div>
</template>

<style scoped>
.metric {
  position: relative;
  overflow: hidden;
  background: var(--gm-surface);
  border: 1px solid var(--gm-line-soft);
  border-radius: var(--gm-radius);
  padding: 16px 18px 15px 20px;
  box-shadow: var(--gm-shadow-sm);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.metric:hover {
  transform: translateY(-3px);
  box-shadow: var(--gm-shadow-md);
}
.accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--mc);
}
.metric.exceed {
  border-color: rgba(239, 68, 68, 0.4);
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.06), var(--gm-surface) 60%);
  box-shadow: 0 6px 22px rgba(239, 68, 68, 0.16);
}
.metric.exceed .accent {
  background: var(--gm-red);
}
.m-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.formula {
  font-size: 12px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 7px;
  color: var(--mc);
  background: color-mix(in srgb, var(--mc) 14%, transparent);
}
.metric.exceed .formula {
  color: var(--gm-red);
  background: rgba(239, 68, 68, 0.12);
}
.m-label {
  font-size: 13px;
  color: var(--gm-ink-soft);
  font-weight: 600;
}
.status {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  color: var(--gm-red);
  background: rgba(239, 68, 68, 0.12);
}
.status.ok {
  color: var(--gm-green);
  background: rgba(22, 163, 74, 0.12);
}
.m-value {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 12px;
}
.m-value strong {
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
  color: var(--gm-ink);
}
.metric.exceed .m-value strong {
  color: var(--gm-red-deep);
}
.unit {
  font-size: 12px;
  color: var(--gm-ink-faint);
}
.m-bar {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: var(--gm-surface-3);
  overflow: hidden;
  margin-bottom: 11px;
}
.m-bar-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: var(--mc);
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.metric.exceed .m-bar-fill {
  background: linear-gradient(90deg, var(--gm-orange), var(--gm-red));
}
.m-bar-limit {
  position: absolute;
  right: 0;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: var(--gm-ink-faint);
  opacity: 0.5;
}
.m-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  color: var(--gm-ink-faint);
}
.m-meta b {
  color: var(--gm-ink-soft);
  font-weight: 700;
}
.m-meta .over {
  margin-left: auto;
  color: var(--gm-red);
  font-weight: 700;
}
</style>
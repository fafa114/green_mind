<script setup lang="ts">
// 内联 SVG 线性图标集（不引入锁定清单外的图标依赖，宪法 II）。
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
    strokeWidth?: number
  }>(),
  { size: 20, strokeWidth: 1.8 },
)

const ICONS: Record<string, string[]> = {
  dashboard: ['M4 4h7v7H4z', 'M13 4h7v4h-7z', 'M13 11h7v9h-7z', 'M4 14h7v6H4z'],
  alarm: ['M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6', 'M10 20a2 2 0 0 0 4 0'],
  prediction: ['M3 17l6-6 4 4 7-8', 'M21 7v5h-5'],
  workorder: ['M9 4h6v3H9z', 'M9 5H6v15h12V5h-3', 'M9 11h6', 'M9 15h4'],
  device: ['M4 5h16v6H4z', 'M4 13h16v6H4z', 'M7 8h.01', 'M7 16h.01'],
  inspection: ['M7 3h10v18H7z', 'M10 18h4', 'M9 8l2 2 4-4'],
  report: ['M7 3h7l4 4v14H7z', 'M14 3v4h4', 'M10 12h5', 'M10 16h5'],
  assistant: ['M4 5h16v11H9l-5 4z', 'M12 8l.8 2.2L15 11l-2.2.8L12 14l-.8-2.2L9 11l2.2-.8z'],
  admin: ['M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6', 'M3 20c0-3 3-5 6-5s6 2 6 5', 'M16 11a3 3 0 1 0-1-5.8', 'M17 15c2 .5 4 2 4 5'],
  logout: ['M15 4h4v16h-4', 'M10 8l-4 4 4 4', 'M6 12h9'],
  leaf: ['M5 19c0-9 6-14 15-14 0 9-5 15-14 15', 'M5 19c3-5 6-8 11-10'],
  wind: ['M3 8h11a3 3 0 1 0-3-3', 'M3 12h16a3 3 0 1 1-3 3', 'M3 16h8a2.5 2.5 0 1 1-2.5 2.5'],
  refresh: ['M20 11a8 8 0 1 0-2 6', 'M20 5v6h-6'],
  chevronRight: ['M9 6l6 6-6 6'],
  chevronDown: ['M6 9l6 6 6-6'],
  alert: ['M12 4l9 16H3z', 'M12 10v4', 'M12 17h.01'],
  check: ['M5 13l4 4L19 7'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M4 21c0-4 4-6 8-6s8 2 8 6'],
  lock: ['M6 11h12v9H6z', 'M9 11V8a3 3 0 0 1 6 0v3'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16', 'M21 21l-4.3-4.3'],
  shield: ['M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z'],
  gauge: ['M4 19a8 8 0 1 1 16 0', 'M12 15l4-4', 'M4 19h16'],
  spark: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L7 10l5.2-1.8z'],
}

const paths = computed(() => ICONS[props.name] ?? ICONS.spark)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke="'currentColor'"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="gm-icon"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>

<style scoped>
.gm-icon {
  display: inline-block;
  flex: none;
  vertical-align: middle;
}
</style>
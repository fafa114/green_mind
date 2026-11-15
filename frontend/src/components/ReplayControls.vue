<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { formatDateTime, formatShort, toISO8601 } from '@/utils/format'

const props = defineProps<{
  start: string
  end: string
  current: string
  playing: boolean
  speed: number
}>()

const emit = defineEmits<{
  (e: 'update:current', value: string): void
  (e: 'update:playing', value: boolean): void
  (e: 'update:speed', value: number): void
}>()

const minMs = computed(() => new Date(props.start).getTime())
const maxMs = computed(() => new Date(props.end).getTime())
const curMs = computed(() => new Date(props.current).getTime())
const speeds = [1, 10, 60]

function onSlide(v: number | number[]): void {
  const value = Array.isArray(v) ? v[0] : v
  emit('update:current', toISO8601(new Date(value)))
}
function tooltip(v: number): string {
  return formatDateTime(toISO8601(new Date(v)))
}
</script>

<template>
  <div class="replay gm-surface">
    <div class="replay-head">
      <span class="replay-badge" :class="{ live: playing }">
        <span v-if="playing" class="gm-live-dot"></span>
        <AppIcon v-else name="gauge" :size="14" />
        历史回放
      </span>
      <span class="replay-time gm-num">{{ formatDateTime(current) }}</span>
      <div class="replay-controls">
        <button class="play-btn" :class="{ playing }" :aria-label="playing ? '暂停' : '播放'" @click="emit('update:playing', !playing)">
          <AppIcon :name="playing ? 'close' : 'chevronRight'" :size="18" :stroke-width="2.4" />
        </button>
        <div class="speeds">
          <button
            v-for="s in speeds"
            :key="s"
            class="speed"
            :class="{ active: speed === s }"
            @click="emit('update:speed', s)"
          >
            {{ s }}×
          </button>
        </div>
      </div>
    </div>
    <div class="replay-slider">
      <span class="bound gm-num">{{ formatShort(start) }}</span>
      <el-slider
        :model-value="curMs"
        :min="minMs"
        :max="maxMs"
        :step="60000"
        :format-tooltip="tooltip"
        :show-tooltip="true"
        class="slider"
        @update:model-value="onSlide"
      />
      <span class="bound gm-num">{{ formatShort(end) }}</span>
    </div>
  </div>
</template>

<style scoped>
.replay {
  padding: 14px 20px 6px;
}
.replay-head {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.replay-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 700;
  padding: 5px 13px;
  border-radius: 999px;
  color: var(--gm-primary);
  background: var(--gm-primary-soft);
  border: 1px solid rgba(15, 118, 110, 0.16);
}
.replay-badge.live {
  color: var(--gm-green);
  background: rgba(22, 163, 74, 0.12);
  border-color: rgba(22, 163, 74, 0.2);
}
.replay-time {
  font-size: 15px;
  font-weight: 700;
  color: var(--gm-ink);
}
.replay-controls {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}
.play-btn {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  color: #fff;
  background: linear-gradient(140deg, var(--gm-primary), var(--gm-primary-bright));
  box-shadow: 0 6px 16px rgba(15, 118, 110, 0.3);
  transition: transform 0.15s ease;
}
.play-btn:hover {
  transform: scale(1.06);
}
.play-btn.playing {
  background: linear-gradient(140deg, var(--gm-amber), var(--gm-orange));
}
.speeds {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 10px;
  background: var(--gm-surface-3);
}
.speed {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 700;
  padding: 5px 11px;
  border-radius: 8px;
  color: var(--gm-ink-soft);
  transition: all 0.15s ease;
}
.speed.active {
  background: var(--gm-surface);
  color: var(--gm-primary);
  box-shadow: var(--gm-shadow-sm);
}
.replay-slider {
  display: flex;
  align-items: center;
  gap: 14px;
}
.bound {
  font-size: 11.5px;
  color: var(--gm-ink-faint);
  flex: none;
}
.slider {
  flex: 1;
}
.slider :deep(.el-slider__bar) {
  background: linear-gradient(90deg, var(--gm-primary), var(--gm-primary-bright));
}
.slider :deep(.el-slider__button) {
  border-color: var(--gm-primary);
}
@media (max-width: 640px) {
  .replay-controls {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }
  .bound {
    display: none;
  }
}
</style>
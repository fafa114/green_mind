<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import LevelTag from '@/components/LevelTag.vue'
import { useAlarmStore } from '@/stores/alarm'
import { ALARM_LEVEL_COLOR, POLLUTANT_LABEL } from '@/api/types'
import { formatNumber } from '@/utils/format'

const router = useRouter()
const alarm = useAlarmStore()

function open(id: number): void {
  router.push({ path: '/alarms', query: { focus: String(id) } })
}
</script>

<template>
  <TransitionGroup name="banner" tag="div" class="banners">
    <div
      v-for="b in alarm.banners"
      :key="b.id"
      class="banner"
      :style="{ '--bc': ALARM_LEVEL_COLOR[b.level] }"
      role="button"
      tabindex="0"
      @click="open(b.id)"
      @keyup.enter="open(b.id)"
    >
      <span class="banner-bar"></span>
      <span class="banner-ico"><AppIcon name="alarm" :size="20" /></span>
      <div class="banner-body">
        <div class="banner-top">
          <strong>{{ b.device_id }} · {{ POLLUTANT_LABEL[b.pollutant] }}</strong>
          <LevelTag :level="b.level" />
        </div>
        <p>{{ b.summary }}</p>
      </div>
      <span class="banner-val gm-num">{{ formatNumber(b.value) }}<small>mg/m³</small></span>
      <button class="banner-close" aria-label="关闭横幅" @click.stop="alarm.dismissBanner(b.id)">
        <AppIcon name="close" :size="16" />
      </button>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.banners {
  display: grid;
  gap: 10px;
}
.banner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px 12px 20px;
  border-radius: 13px;
  background: var(--gm-surface);
  border: 1px solid color-mix(in srgb, var(--bc) 32%, transparent);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--bc) 16%, transparent);
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.15s ease;
}
.banner:hover {
  transform: translateX(3px);
}
.banner-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: var(--bc);
}
.banner-ico {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 10px;
  color: var(--bc);
  background: color-mix(in srgb, var(--bc) 14%, transparent);
}
.banner-body {
  min-width: 0;
  flex: 1;
}
.banner-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 3px;
}
.banner-top strong {
  font-size: 14px;
  color: var(--gm-ink);
}
.banner-body p {
  margin: 0;
  font-size: 12.5px;
  color: var(--gm-ink-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.banner-val {
  font-size: 20px;
  font-weight: 800;
  color: var(--bc);
  flex: none;
}
.banner-val small {
  font-size: 11px;
  font-weight: 500;
  color: var(--gm-ink-faint);
  margin-left: 3px;
}
.banner-close {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--gm-ink-faint);
  display: grid;
  place-items: center;
  padding: 4px;
  flex: none;
}
.banner-close:hover {
  color: var(--gm-ink);
}
.banner-enter-active,
.banner-leave-active {
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.banner-enter-from {
  opacity: 0;
  transform: translateY(-14px);
}
.banner-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
@media (max-width: 640px) {
  .banner-val {
    display: none;
  }
}
</style>
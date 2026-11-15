<template>
  <transition-group name="banner" tag="div" class="alarm-banner-wrap">
    <div v-for="b in alarmStore.banners" :key="b.key" class="alarm-banner" :class="b.level" @click="goAlarms">
      <span class="lv">{{ levelName(b.level) }}告警</span>
      <span>{{ b.device_id }} {{ pollutantName(b.pollutant) }} {{ b.value }} mg/m³</span>
      <span class="go">点击查看 →</span>
    </div>
  </transition-group>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAlarmStore } from '../stores/alarm'
import { levelName, pollutantName } from '../utils/format'

const alarmStore = useAlarmStore()
const router = useRouter()

function goAlarms() {
  router.push('/alarms')
}
</script>

<style scoped>
.alarm-banner-wrap { position: fixed; top: 12px; right: 16px; z-index: 2000; display: flex; flex-direction: column; gap: 8px; }
.alarm-banner { color: #fff; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; box-shadow: 0 2px 12px rgba(0,0,0,.2); display: flex; gap: 10px; align-items: center; }
.alarm-banner.red { background: #f56c6c; }
.alarm-banner.orange { background: #e6a23c; }
.alarm-banner.yellow { background: #d4b106; }
.alarm-banner .lv { font-weight: 700; }
.alarm-banner .go { margin-left: 8px; opacity: .9; }
.banner-enter-active, .banner-leave-active { transition: all .4s; }
.banner-enter-from, .banner-leave-to { opacity: 0; transform: translateX(30px); }
</style>

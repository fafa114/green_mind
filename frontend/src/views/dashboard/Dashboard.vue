<template>
  <div class="dashboard dark">
    <div class="top">
      <el-select v-model="deviceId" style="width: 220px" @change="reload">
        <el-option v-for="d in devices" :key="d.device_id" :value="d.device_id" :label="`${d.device_id} ${d.name}`" />
      </el-select>
      <div class="replay">
        <span class="lbl">时间回放</span>
        <el-slider v-model="replayOffset" :min="0" :max="1440" :step="5" style="width: 240px; margin: 0 12px" :format-tooltip="replayLabel" @change="reload" />
        <span class="lbl">{{ replayLabel(replayOffset) }}</span>
      </div>
      <el-tag :type="conditionType" effect="dark">{{ conditionName(latest?.condition_flag) }}</el-tag>
    </div>

    <div class="metrics">
      <MetricCard v-for="p in POLLUTANTS" :key="p.key" :name="p.name" :value="latest?.[p.key + '_std']" :limit="latest?.[p.key + '_limit']" unit=" mg/m³" />
      <MetricCard name="炉温" :value="latest?.furnace_temp" :limit="850" unit=" ℃" :digits="1" />
      <MetricCard name="流量" :value="latest?.flow" :limit="null" unit=" m³/h" :digits="0" />
    </div>

    <div class="charts">
      <div class="panel">
        <div class="panel-title">24 小时污染物趋势（折算浓度，虚线为标准值）</div>
        <TrendChart dark height="300px" :series="pollutantSeries" :y-axis="[{ name: 'mg/m³' }]" />
      </div>
      <div class="panel">
        <div class="panel-title">炉温 / 流量</div>
        <TrendChart dark height="300px" :series="furnaceSeries" :y-area="[{ name: '流量', data: [] }]" :y-axis="[{ name: '℃' }, { name: 'm³/h' }]" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MetricCard from '../../components/MetricCard.vue'
import TrendChart from '../../components/TrendChart.vue'
import { getHistory, getLatest, listDataDevices } from '../../api/data'
import { POLLUTANTS, type CemsRow, type DeviceInfo } from '../../types'
import { conditionName } from '../../utils/format'

const devices = ref<DeviceInfo[]>([])
const deviceId = ref('CEMS-01')
const latest = ref<CemsRow | null>(null)
const history = ref<CemsRow[]>([])
const replayOffset = ref(0)

const conditionType = computed(() => {
  const f = latest.value?.condition_flag
  return { normal: 'success', startup: 'primary', shutdown: 'info', fault: 'danger' }[f || 'normal'] || 'info'
})

const pollutantSeries = computed(() => {
  const series: { name: string; data: [string, number][]; dashed?: boolean }[] = []
  for (const p of POLLUTANTS) {
    series.push({ name: p.name, data: history.value.map((r) => [r.ts, Number(r[p.key + '_std'] ?? 0)]) })
    if (history.value.length) {
      series.push({ name: `${p.name}标准`, data: history.value.map((r) => [r.ts, Number(r[p.key + '_limit'] ?? p.limit)]), dashed: true })
    }
  }
  return series
})

const furnaceSeries = computed(() => [
  { name: '炉温', data: history.value.map((r) => [r.ts, Number(r.furnace_temp ?? 0)]) },
  { name: '流量', data: history.value.map((r) => [r.ts, Number(r.flow ?? 0)]),
  },
])

function replayLabel(minutes: number): string {
  if (minutes === 0) return '实时'
  return `${minutes} 分钟前`
}

async function reload() {
  const asOf = replayOffset.value === 0 ? undefined : new Date(Date.now() - replayOffset.value * 60000).toISOString().slice(0, 19)
  const end = asOf || new Date().toISOString().slice(0, 19)
  const start = new Date(new Date(end).getTime() - 24 * 3600000).toISOString().slice(0, 19)
  const [latestRow, hist] = await Promise.all([
    getLatest(deviceId.value, asOf),
    getHistory({ device_id: deviceId.value, start, end, interval: 'hour' }),
  ])
  latest.value = latestRow
  history.value = hist.items
}

onMounted(async () => {
  devices.value = await listDataDevices()
  await reload()
  setInterval(reload, 60000)
})
</script>

<style scoped>
.dashboard { min-height: 100%; border-radius: 8px; padding: 16px; }
.dark { background: #0d1a26; color: #c8d3dc; }
.top { display: flex; align-items: center; gap: 24px; margin-bottom: 14px; flex-wrap: wrap; }
.replay { display: flex; align-items: center; }
.lbl { color: #7d93a8; font-size: 13px; }
.metrics { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-bottom: 14px; }
.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.panel { background: #152233; border: 1px solid #24405a; border-radius: 8px; padding: 12px; }
.panel-title { color: #7d93a8; font-size: 13px; margin-bottom: 8px; }
@media (max-width: 1200px) { .charts { grid-template-columns: 1fr; } }
</style>

<template>
  <div class="dashboard dark">
    <div class="top">
      <el-select v-model="deviceId" style="width: 220px" @change="reload">
        <el-option v-for="d in devices" :key="d.device_id" :value="d.device_id" :label="`${d.device_id} ${d.name}`" />
      </el-select>
      <div class="replay">
        <span class="lbl">历史数据回放 {{ replay?.speed || 1 }}×</span>
        <el-slider v-model="replayOffset" :min="0" :max="1440" :step="5" style="width: 240px; margin: 0 12px" :format-tooltip="replayLabel" @change="reload" />
        <span class="lbl">{{ replayLabel(replayOffset) }}</span>
      </div>
      <span class="lbl">原始采样时间：{{ latest?.ts || '--' }}</span>
      <el-tag :type="conditionType" effect="dark">{{ conditionName(latest?.condition_flag) }}</el-tag>
      <el-tag v-if="latest?.report_flag !== 1" type="warning">源数据标记：维护或故障</el-tag>
      <span v-if="latest?.condition_flag !== 'normal'" class="lbl">非正常工况，仅展示源数据，不触发浓度告警</span>
    </div>

    <div class="metrics">
      <MetricCard v-for="p in POLLUTANTS" :key="p.key" :name="p.name" :value="latest?.[p.key + '_std']" :limit="latest?.[p.key + '_limit']" :active="latest?.condition_flag === 'normal' && latest?.report_flag === 1" unit=" mg/m³" />
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import MetricCard from '../../components/MetricCard.vue'
import TrendChart from '../../components/TrendChart.vue'
import { getHistory, getLatest, getReplay, listDataDevices, type ReplayStatus } from '../../api/data'
import { POLLUTANTS, type CemsRow, type DeviceInfo } from '../../types'
import { conditionName } from '../../utils/format'

const devices = ref<DeviceInfo[]>([])
const deviceId = ref('CEMS-01')
const latest = ref<CemsRow | null>(null)
const history = ref<CemsRow[]>([])
const replayOffset = ref(0)
const replay = ref<ReplayStatus | null>(null)
let timer: ReturnType<typeof setInterval> | undefined

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
  { name: '炉温', data: history.value.map((r) => [r.ts, Number(r.furnace_temp ?? 0)] as [string, number]) },
  { name: '流量', data: history.value.map((r) => [r.ts, Number(r.flow ?? 0)] as [string, number]),
  },
])

function localTime(value: Date): string {
  const n = (x: number) => String(x).padStart(2, '0')
  return `${value.getFullYear()}-${n(value.getMonth() + 1)}-${n(value.getDate())}T${n(value.getHours())}:${n(value.getMinutes())}:${n(value.getSeconds())}`
}

function replayLabel(minutes: number): string {
  if (!replay.value) return '--'
  return localTime(new Date(Math.max(new Date(replay.value.source_start).getTime(), new Date(replay.value.cursor).getTime() - minutes * 60000)))
}

async function reload() {
  if (!deviceId.value) return
  replay.value = await getReplay(deviceId.value)
  const cursor = new Date(replay.value.cursor)
  const asOf = replayOffset.value === 0 ? undefined : localTime(new Date(Math.max(new Date(replay.value.source_start).getTime(), cursor.getTime() - replayOffset.value * 60000)))
  const endDate = asOf ? new Date(asOf) : cursor
  const end = localTime(new Date(endDate.getTime() + 1000))
  const sourceStart = new Date(replay.value.source_start).getTime()
  const start = localTime(new Date(Math.max(sourceStart, endDate.getTime() - 24 * 3600000)))
  const [latestRow, hist] = await Promise.all([
    getLatest(deviceId.value, asOf),
    getHistory({ device_id: deviceId.value, start, end, interval: 'hour' }),
  ])
  latest.value = latestRow
  history.value = hist.items
}

onMounted(async () => {
  devices.value = await listDataDevices()
  deviceId.value = devices.value[0]?.device_id || ''
  await reload()
  timer = setInterval(reload, 1000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })
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

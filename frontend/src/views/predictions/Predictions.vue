<template>
  <div class="pred">
    <div class="filters">
      <el-select v-model="deviceId" style="width: 220px" @change="reload">
        <el-option v-for="d in devices" :key="d.device_id" :label="`${d.device_id} ${d.name}`" :value="d.device_id" />
      </el-select>
      <el-select v-model="pollutant" style="width: 130px" @change="reload">
        <el-option v-for="p in POLLUTANTS" :key="p.key" :label="p.name" :value="p.key" />
      </el-select>
      <el-button v-if="userStore.isAdmin" type="primary" plain :loading="refreshing" @click="refresh">立即刷新预测</el-button>
    </div>

    <div class="panel">
      <div class="panel-title">历史回放（实线，近 24h）与趋势参考（虚线，未来 6h） · 置信度 {{ confidenceText }}</div>
      <TrendChart height="320px" :series="series" :area="bandArea" :y-axis="[{ name: 'mg/m³' }]" />
    </div>

    <div class="row">
      <div class="panel">
        <div class="panel-title">逐小时超标概率</div>
        <TrendChart v-if="probs.length" height="240px" :series="[{ name: '超标概率', data: probs, type: 'bar' }]" :y-axis="[{ name: '概率', max: 1 }]" />
        <el-empty v-else description="暂无经过校准的超标概率" :image-size="60" />
      </div>
      <div class="panel">
        <div class="panel-title">驱动因素</div>
        <ul class="drivers">
          <li v-for="(d, i) in drivers" :key="i">{{ d }}</li>
        </ul>
        <div class="note">{{ prediction?.result.notice || '有效样本不足时等待回放推进；趋势参考不构成合规结论。' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import TrendChart from '../../components/TrendChart.vue'
import { getLatestPrediction, refreshPredictions } from '../../api/predictions'
import { getHistory, getReplay, listDataDevices } from '../../api/data'
import { useUserStore } from '../../stores/user'
import { POLLUTANTS, type DeviceInfo, type Prediction } from '../../types'

const userStore = useUserStore()
const devices = ref<DeviceInfo[]>([])
const deviceId = ref('')
const pollutant = ref('so2')
const prediction = ref<Prediction | null>(null)
const hist = ref<[string, number][]>([])
const refreshing = ref(false)

const series = computed(() => {
  const out: { name: string; data: [string, number][]; dashed?: boolean }[] = []
  if (hist.value.length) out.push({ name: '历史浓度', data: hist.value })
  if (prediction.value) {
    out.push({ name: '预测浓度', data: prediction.value.result.hours.map((h) => [h.ts, h.value]), dashed: true })
  }
  return out
})

const bandArea = computed(() => {
  if (!prediction.value || prediction.value.result.experimental) return []
  const c = prediction.value.result.confidence
  const band = prediction.value.result.hours.map((h) => {
    const lo = Math.max(0, h.value * (1 - (1 - c)))
    return [h.ts, Math.round((h.value - lo) * 100) / 100] as [string, number]
  })
  return [{ name: '置信区间', data: band }]
})

const probs = computed(() => (prediction.value && !prediction.value.result.experimental ? prediction.value.result.hours.map((h) => [h.ts, h.exceed_prob] as [string, number]) : []))
const drivers = computed(() => prediction.value?.result.drivers || [])
const confidenceText = computed(() => prediction.value && !prediction.value.result.experimental ? Math.round(prediction.value.result.confidence * 100) + '%' : '--')

function localTime(value: Date): string {
  const n = (x: number) => String(x).padStart(2, '0')
  return `${value.getFullYear()}-${n(value.getMonth() + 1)}-${n(value.getDate())}T${n(value.getHours())}:${n(value.getMinutes())}:${n(value.getSeconds())}`
}

async function reload() {
  if (!deviceId.value) return
  const replay = await getReplay(deviceId.value)
  const cursor = new Date(replay.cursor)
  const end = localTime(new Date(cursor.getTime() + 1000))
  const start = localTime(new Date(Math.max(new Date(replay.source_start).getTime(), cursor.getTime() - 24 * 3600000)))
  const h = await getHistory({ device_id: deviceId.value, start, end, interval: 'hour' })
  hist.value = h.items.map((r) => [r.ts, Number(r[pollutant.value + '_std'] ?? 0)] as [string, number])
  try {
    prediction.value = await getLatestPrediction(deviceId.value, pollutant.value)
  } catch {
    prediction.value = null
  }
}

async function refresh() {
  refreshing.value = true
  try {
    await refreshPredictions(deviceId.value)
    await reload()
    ElMessage.success('预测已刷新')
  } finally {
    refreshing.value = false
  }
}

onMounted(async () => {
  devices.value = await listDataDevices()
  deviceId.value = devices.value[0]?.device_id || ''
  await reload()
})
</script>

<style scoped>
.filters { display: flex; gap: 10px; margin-bottom: 12px; background: #fff; padding: 12px; border-radius: 6px; }
.panel { background: #fff; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
.panel-title { color: #606266; font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.drivers { padding-left: 20px; }
.note { color: #909399; font-size: 12px; margin-top: 10px; }
</style>

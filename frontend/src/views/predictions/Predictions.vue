<template>
  <div class="pred">
    <div class="filters">
      <el-select v-model="deviceId" style="width: 220px" @change="reload">
        <el-option label="CEMS-01 1# 焚烧线" value="CEMS-01" />
        <el-option label="CEMS-02 2# 焚烧线" value="CEMS-02" />
      </el-select>
      <el-select v-model="pollutant" style="width: 130px" @change="reload">
        <el-option v-for="p in POLLUTANTS" :key="p.key" :label="p.name" :value="p.key" />
      </el-select>
      <el-button v-if="userStore.isAdmin" type="primary" plain :loading="refreshing" @click="refresh">立即刷新预测</el-button>
    </div>

    <div class="panel">
      <div class="panel-title">历史（实线，近 24h）与预测（虚线，未来 6h） · 置信度 {{ confidenceText }}</div>
      <TrendChart height="320px" :series="series" :area="bandArea" :y-axis="[{ name: 'mg/m³' }]" />
    </div>

    <div class="row">
      <div class="panel">
        <div class="panel-title">逐小时超标概率</div>
        <TrendChart v-if="probs.length" height="240px" :series="[{ name: '超标概率', data: probs, type: 'bar' }]" :y-axis="[{ name: '概率', max: 1 }]" />
        <el-empty v-else description="暂无预测数据" :image-size="60" />
      </div>
      <div class="panel">
        <div class="panel-title">驱动因素</div>
        <ul class="drivers">
          <li v-for="(d, i) in drivers" :key="i">{{ d }}</li>
        </ul>
        <div class="note">预测结果为“方向性趋势参考”，不构成精确数值承诺。</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import TrendChart from '../../components/TrendChart.vue'
import { getLatestPrediction, refreshPredictions } from '../../api/predictions'
import { getHistory } from '../../api/data'
import { useUserStore } from '../../stores/user'
import { POLLUTANTS, type Prediction } from '../../types'

const userStore = useUserStore()
const deviceId = ref('CEMS-01')
const pollutant = ref('so2')
const prediction = ref<Prediction | null>(null)
const hist: [string, number][] = []
const refreshing = ref(false)

const series = computed(() => {
  const out: { name: string; data: [string, number][]; dashed?: boolean }[] = []
  if (hist.length) out.push({ name: '历史浓度', data: hist })
  if (prediction.value) {
    out.push({ name: '预测浓度', data: prediction.value.result.hours.map((h) => [h.ts, h.value]), dashed: true })
  }
  return out
})

const bandArea = computed(() => {
  if (!prediction.value) return []
  const c = prediction.value.result.confidence
  const band = prediction.value.result.hours.map((h) => {
    const lo = Math.max(0, h.value * (1 - (1 - c)))
    return [h.ts, Math.round((h.value - lo) * 100) / 100] as [string, number]
  })
  return [{ name: '置信区间', data: band }]
})

const probs = computed(() => (prediction.value ? prediction.value.result.hours.map((h) => [h.ts, h.exceed_prob] as [string, number]) : []))
const drivers = computed(() => prediction.value?.result.drivers || [])
const confidenceText = computed(() => prediction.value ? Math.round(prediction.value.result.confidence * 100) + '%' : '--')

async function reload() {
  const end = new Date().toISOString().slice(0, 19)
  const start = new Date(Date.now() - 24 * 3600000).toISOString().slice(0, 19)
  const [h, p] = await Promise.all([
    getHistory({ device_id: deviceId.value, start, end, interval: 'hour' }),
    getLatestPrediction(deviceId.value, pollutant.value),
  ])
  hist.length = 0
  for (const r of h.items) hist.push([r.ts, Number(r[pollutant.value + '_std'] ?? 0)])
  prediction.value = p
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

onMounted(reload)
</script>

<style scoped>
.filters { display: flex; gap: 10px; margin-bottom: 12px; background: #fff; padding: 12px; border-radius: 6px; }
.panel { background: #fff; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
.panel-title { color: #606266; font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.drivers { padding-left: 20px; }
.note { color: #909399; font-size: 12px; margin-top: 10px; }
</style>

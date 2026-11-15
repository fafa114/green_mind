<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import AppIcon from '@/components/AppIcon.vue'
import PageTable from '@/components/PageTable.vue'
import { fetchDevices, fetchHistory } from '@/api/data'
import { fetchLatestPrediction, fetchPredictionHistory, refreshPrediction } from '@/api/prediction'
import { usePermission } from '@/utils/permission'
import { POLLUTANTS, type DeviceOption, type HistoryPoint, type PredictionResult, type PredictionRecord, type PollutantCode } from '@/api/types'
import { formatShort, formatDateTime, formatPercent, toISO8601 } from '@/utils/format'

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, CanvasRenderer])

const { isAdmin } = usePermission()
const devices = ref<DeviceOption[]>([])
const deviceId = ref('CEMS-01')
const pollutant = ref<PollutantCode>('pm')
const history = ref<HistoryPoint[]>([])
const prediction = ref<{ base_ts: string; result: PredictionResult } | null>(null)
const predHistory = ref<PredictionRecord[]>([])
const predTotal = ref(0)
const predPage = ref(1)
const loading = ref(false)
const refreshing = ref(false)

const trendEl = ref<HTMLDivElement | null>(null)
const probEl = ref<HTMLDivElement | null>(null)
let trendChart: echarts.ECharts | null = null
let probChart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

const currentMeta = computed(() => POLLUTANTS.find((p) => p.code === pollutant.value)!)
const limit = computed(() => ({ pm: 20, so2: 80, nox: 250, co: 80, hcl: 50 }[pollutant.value]))
const stdKey = computed(() => `${pollutant.value}_std` as keyof HistoryPoint)

async function load(): Promise<void> {
  loading.value = true
  try {
    const end = new Date()
    const start = new Date(end.getTime() - 24 * 3600e3)
    const [h, p] = await Promise.all([
      fetchHistory(deviceId.value, toISO8601(start), toISO8601(end), 'hour'),
      fetchLatestPrediction(deviceId.value, pollutant.value),
    ])
    history.value = h.items
    prediction.value = p
    await loadPredHistory()
    renderCharts()
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '预测加载失败')
  } finally {
    loading.value = false
  }
}

async function loadPredHistory(): Promise<void> {
  const res = await fetchPredictionHistory(deviceId.value, pollutant.value, predPage.value, 5)
  predHistory.value = res.items
  predTotal.value = res.total
}

function buildTrend(): EChartsOption {
  const color = currentMeta.value.color
  const histVals = history.value.map((p) => Number(p[stdKey.value]))
  const hours = prediction.value?.result.hours ?? []
  const conf = prediction.value?.result.confidence ?? 0.7
  const cats = [...history.value.map((p) => formatShort(p.ts)), ...hours.map((h) => formatShort(h.ts))]
  const n = history.value.length
  const histData: (number | null)[] = [...histVals, ...hours.map(() => null)]
  const predData: (number | null)[] = history.value.map(() => null)
  if (n > 0) predData[n - 1] = histVals[n - 1]
  hours.forEach((h) => predData.push(h.value))
  const lower: (number | null)[] = history.value.map(() => null)
  const band: (number | null)[] = history.value.map(() => null)
  if (n > 0) { lower[n - 1] = histVals[n - 1] * conf; band[n - 1] = histVals[n - 1] * (1 - conf) }
  hours.forEach((h) => { lower.push(h.value * conf); band.push(h.value * (1 - conf) * 2) })

  return {
    grid: { left: 50, right: 20, top: 40, bottom: 34 },
    legend: { data: ['历史实测', '预测值'], top: 6, right: 10, textStyle: { color: '#4c6b64', fontSize: 12 } },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(8,47,43,0.92)', borderWidth: 0, textStyle: { color: '#e6f4f1', fontSize: 12 } },
    xAxis: { type: 'category', boundaryGap: false, data: cats, axisLabel: { color: '#8ba49d', fontSize: 10, interval: 4, hideOverlap: true, formatter: (v: string) => (v.includes(' ') ? v.split(' ')[1] : v) }, axisLine: { lineStyle: { color: '#d9e6e0' } }, axisTick: { show: false } },
    yAxis: { type: 'value', name: 'mg/m³', nameTextStyle: { color: '#8ba49d', fontSize: 11 }, axisLabel: { color: '#8ba49d', fontSize: 11 }, splitLine: { lineStyle: { color: '#eef3f1' } } },
    series: [
      { name: '置信下界', type: 'line', stack: 'band', symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 }, data: lower, silent: true, tooltip: { show: false } },
      { name: '置信区间', type: 'line', stack: 'band', symbol: 'none', lineStyle: { opacity: 0 }, areaStyle: { color, opacity: 0.16 }, data: band, silent: true, tooltip: { show: false } },
      { name: '历史实测', type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2.4, color }, itemStyle: { color }, data: histData,
        markLine: { silent: true, symbol: 'none', label: { formatter: '预测起点', position: 'insideEndTop', color: '#0f766e', fontSize: 10, backgroundColor: '#ffffff', padding: [2, 5], borderRadius: 3 }, lineStyle: { color: '#8ba49d', type: 'dashed' }, data: [{ xAxis: n - 1 }] } },
      { name: '预测值', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.4, color, type: 'dashed' }, itemStyle: { color }, data: predData },
      { name: '标准值', type: 'line', symbol: 'none', silent: true, lineStyle: { width: 1, type: 'dashed', color: '#ef4444', opacity: 0.6 }, data: cats.map(() => limit.value), tooltip: { show: false } },
    ],
  }
}

function buildProb(): EChartsOption {
  const hours = prediction.value?.result.hours ?? []
  return {
    grid: { left: 46, right: 16, top: 20, bottom: 30 },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(8,47,43,0.92)', borderWidth: 0, textStyle: { color: '#e6f4f1', fontSize: 12 }, valueFormatter: (v) => `${Number(v).toFixed(0)}%` },
    xAxis: { type: 'category', data: hours.map((h) => formatShort(h.ts)), axisLabel: { color: '#8ba49d', fontSize: 10, formatter: (v: string) => (v.includes(' ') ? v.split(' ')[1] : v) }, axisLine: { lineStyle: { color: '#d9e6e0' } }, axisTick: { show: false } },
    yAxis: { type: 'value', max: 100, name: '%', nameTextStyle: { color: '#8ba49d', fontSize: 11 }, axisLabel: { color: '#8ba49d', fontSize: 11 }, splitLine: { lineStyle: { color: '#eef3f1' } } },
    series: [{
      type: 'bar', barWidth: '46%', data: hours.map((h) => ({
        value: Number((h.exceed_prob * 100).toFixed(0)),
        itemStyle: { color: h.exceed_prob >= 0.6 ? '#ef4444' : h.exceed_prob >= 0.3 ? '#f59e0b' : '#16a34a', borderRadius: [5, 5, 0, 0] },
      })),
    }],
  }
}

function renderCharts(): void {
  trendChart?.setOption(buildTrend(), { notMerge: true })
  probChart?.setOption(buildProb(), { notMerge: true })
}

async function refresh(): Promise<void> {
  refreshing.value = true
  try {
    prediction.value = await refreshPrediction(deviceId.value, pollutant.value)
    renderCharts()
    ElMessage.success('预测已刷新')
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '刷新失败')
  } finally {
    refreshing.value = false
  }
}

function onPredPage(p: { page: number }): void {
  predPage.value = p.page
  void loadPredHistory()
}

watch([deviceId, pollutant], () => { predPage.value = 1; void load() })

onMounted(async () => {
  devices.value = await fetchDevices().catch(() => [])
  if (devices.value.length) deviceId.value = devices.value[0].device_id
  if (trendEl.value) trendChart = echarts.init(trendEl.value)
  if (probEl.value) probChart = echarts.init(probEl.value)
  ro = new ResizeObserver(() => { trendChart?.resize(); probChart?.resize() })
  if (trendEl.value) ro.observe(trendEl.value)
  await load()
})
onBeforeUnmount(() => {
  ro?.disconnect()
  trendChart?.dispose()
  probChart?.dispose()
})
</script>

<template>
  <div class="pred">
    <header class="page-head gm-fade-up">
      <div>
        <p class="eyebrow">趋势预测 · 实验性</p>
        <h1>排放趋势预测</h1>
      </div>
      <div class="head-tools">
        <el-select v-model="deviceId" size="large" class="sel" :loading="loading">
          <el-option v-for="d in devices" :key="d.device_id" :label="d.device_id" :value="d.device_id" />
        </el-select>
        <el-select v-model="pollutant" size="large" class="sel">
          <el-option v-for="p in POLLUTANTS" :key="p.code" :label="`${p.formula} ${p.label}`" :value="p.code" />
        </el-select>
        <el-button v-if="isAdmin" size="large" type="primary" :loading="refreshing" @click="refresh">
          <AppIcon v-if="!refreshing" name="refresh" :size="16" /><span style="margin-left: 6px">刷新预测</span>
        </el-button>
      </div>
    </header>

    <div v-loading="loading" class="pred-grid">
      <section class="panel gm-surface gm-fade-up chart-panel">
        <div class="panel-head">
          <div>
            <h2>{{ currentMeta.label }} · 历史 + 未来 6 小时预测</h2>
            <p>实线为历史折算浓度，虚线为预测，阴影为置信区间</p>
          </div>
          <span v-if="prediction" class="conf-tag gm-num">置信度 {{ formatPercent(prediction.result.confidence) }}</span>
        </div>
        <div ref="trendEl" class="chart" style="height: 320px"></div>
        <p v-if="prediction" class="base-ts">预测基准时间：{{ formatDateTime(prediction.base_ts) }}</p>
        <el-alert v-if="!prediction && !loading" title="暂无该设备/污染物的预测数据" type="info" :closable="false" />
      </section>

      <aside class="pred-side">
        <section class="panel gm-surface gm-fade-up">
          <div class="panel-head"><h2>超标概率</h2></div>
          <div ref="probEl" class="chart" style="height: 180px"></div>
        </section>
        <section class="panel gm-surface gm-fade-up">
          <div class="panel-head"><h2>驱动因素</h2></div>
          <ul v-if="prediction" class="drivers">
            <li v-for="(d, i) in prediction.result.drivers" :key="i">
              <AppIcon name="prediction" :size="15" /> {{ d }}
            </li>
          </ul>
          <p v-else class="muted">暂无数据</p>
          <p class="note">实验性预测，仅供运维参考，不构成确定结论或监管判定。</p>
        </section>
      </aside>
    </div>

    <section class="panel gm-surface gm-fade-up">
      <div class="panel-head"><h2>历史预测记录</h2></div>
      <PageTable :data="predHistory" :total="predTotal" :page="predPage" :page-size="5" @change="onPredPage">
        <el-table-column label="基准时间" min-width="170">
          <template #default="{ row }"><span class="gm-num">{{ formatDateTime(row.base_ts) }}</span></template>
        </el-table-column>
        <el-table-column label="置信度" width="100">
          <template #default="{ row }"><span class="gm-num">{{ formatPercent(row.result.confidence) }}</span></template>
        </el-table-column>
        <el-table-column label="首点预测值" width="130">
          <template #default="{ row }"><span class="gm-num">{{ row.result.hours[0]?.value }} mg/m³</span></template>
        </el-table-column>
        <el-table-column label="驱动因素" min-width="220">
          <template #default="{ row }">{{ row.result.drivers.join('、') }}</template>
        </el-table-column>
      </PageTable>
    </section>
  </div>
</template>

<style scoped>
.pred { display: grid; gap: 18px; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.eyebrow { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gm-primary); font-weight: 700; margin: 0 0 6px; }
.page-head h1 { margin: 0; font-size: 27px; font-weight: 800; color: var(--gm-ink); }
.head-tools { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.sel { width: 180px; }
.pred-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); gap: 18px; align-items: start; }
.pred-side { display: grid; gap: 18px; }
.panel { padding: 20px 22px; }
.panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.panel-head h2 { margin: 0; font-size: 16px; font-weight: 700; color: var(--gm-ink); }
.panel-head p { margin: 3px 0 0; font-size: 12.5px; color: var(--gm-ink-faint); }
.conf-tag { font-size: 12px; font-weight: 700; color: var(--gm-primary); background: var(--gm-primary-soft); padding: 4px 12px; border-radius: 999px; white-space: nowrap; }
.chart { width: 100%; }
.base-ts { margin: 10px 0 0; font-size: 12px; color: var(--gm-ink-faint); }
.drivers { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.drivers li { display: flex; align-items: center; gap: 9px; font-size: 13.5px; color: var(--gm-ink-soft); padding: 9px 13px; border-radius: 10px; background: var(--gm-surface-2); }
.drivers li .gm-icon { color: var(--gm-primary); flex: none; }
.muted { font-size: 13px; color: var(--gm-ink-faint); }
.note { margin: 14px 0 0; font-size: 12px; line-height: 1.5; color: var(--gm-ink-faint); }
@media (max-width: 1100px) { .pred-grid { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .sel { width: 100%; } .head-tools { width: 100%; } }
</style>
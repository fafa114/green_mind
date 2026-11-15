<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { POLLUTANTS, type HistoryPoint, type PollutantCode } from '@/api/types'
import { formatShort } from '@/utils/format'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const props = withDefaults(
  defineProps<{
    points: HistoryPoint[]
    limits: Record<PollutantCode, number>
    height?: number
  }>(),
  { height: 320 },
)

const STD_KEY: Record<PollutantCode, keyof HistoryPoint> = {
  pm: 'pm_std',
  so2: 'so2_std',
  nox: 'nox_std',
  co: 'co_std',
  hcl: 'hcl_std',
}

const el = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

function buildOption(): EChartsOption {
  const categories = props.points.map((p) => formatShort(p.ts))
  const series: EChartsOption['series'] = []

  for (const meta of POLLUTANTS) {
    series.push({
      name: meta.label,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      showSymbol: false,
      lineStyle: { width: 2.2, color: meta.color },
      itemStyle: { color: meta.color },
      emphasis: { focus: 'series' },
      data: props.points.map((p) => Number(p[STD_KEY[meta.code]])),
    })
    series.push({
      name: `${meta.label}标准`,
      type: 'line',
      symbol: 'none',
      silent: true,
      lineStyle: { width: 1, type: 'dashed', opacity: 0.38, color: meta.color },
      data: props.points.map(() => props.limits[meta.code]),
      tooltip: { show: false },
    })
  }

  return {
    color: POLLUTANTS.map((p) => p.color),
    grid: { left: 52, right: 18, top: 54, bottom: 34 },
    legend: {
      type: 'scroll',
      data: POLLUTANTS.map((p) => p.label),
      top: 8,
      left: 'center',
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 4,
      itemGap: 16,
      textStyle: { color: '#4c6b64', fontSize: 12 },
      pageIconColor: '#0f766e',
      pageIconInactiveColor: '#c5d8d2',
      pageTextStyle: { color: '#8ba49d' },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8,47,43,0.92)',
      borderWidth: 0,
      textStyle: { color: '#e6f4f1', fontSize: 12 },
      valueFormatter: (v) => (v == null ? '--' : `${Number(v).toFixed(1)} mg/m³`),
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: categories,
      axisLine: { lineStyle: { color: '#d9e6e0' } },
      axisLabel: {
        color: '#8ba49d',
        fontSize: 11,
        interval: 3,
        hideOverlap: true,
        formatter: (value: string) => (value.includes(' ') ? value.split(' ')[1] : value),
      },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: 'mg/m³',
      nameLocation: 'middle',
      nameGap: 40,
      nameRotate: 90,
      nameTextStyle: { color: '#8ba49d', fontSize: 11 },
      axisLabel: { color: '#8ba49d', fontSize: 11 },
      splitLine: { lineStyle: { color: '#eef3f1' } },
    },
    series,
  }
}

function render(): void {
  chart?.setOption(buildOption(), { notMerge: true })
}

onMounted(() => {
  if (!el.value) return
  chart = echarts.init(el.value)
  render()
  ro = new ResizeObserver(() => chart?.resize())
  ro.observe(el.value)
})

watch(() => [props.points, props.limits], render, { deep: true })

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="el" class="trend-chart" :style="{ height: height + 'px' }"></div>
</template>

<style scoped>
.trend-chart {
  width: 100%;
}
</style>
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

// props 命名对齐执行版第七节：series/limits
const props = withDefaults(
  defineProps<{
    series: HistoryPoint[]
    limits: Record<PollutantCode, number>
    height?: number
    showParams?: boolean
  }>(),
  { height: 340, showParams: true },
)

const STD_KEY: Record<PollutantCode, keyof HistoryPoint> = {
  pm: 'pm_std', so2: 'so2_std', nox: 'nox_std', co: 'co_std', hcl: 'hcl_std',
}
const PARAM_COLOR = { furnace: '#f59e0b', flow: '#0ea5e9' }

const el = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

function unitOf(name: string): string {
  if (name === '炉温') return '℃'
  if (name === '烟气流量') return 'm³/h'
  return 'mg/m³'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tooltipFormatter(params: any): string {
  const list = Array.isArray(params) ? params : [params]
  if (list.length === 0) return ''
  const head = `<div style="font-weight:700;margin-bottom:6px">${list[0].axisValue}</div>`
  const rows = list
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((p: any) => !String(p.seriesName).endsWith('标准'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => {
      const val = p.value == null ? '--' : Number(p.value).toFixed(1)
      return `<div style="display:flex;align-items:center;gap:6px;line-height:1.7">${p.marker}<span>${p.seriesName}</span><b style="margin-left:auto;padding-left:14px">${val} ${unitOf(p.seriesName)}</b></div>`
    })
    .join('')
  return head + rows
}

function buildOption(): EChartsOption {
  const categories = props.series.map((p) => formatShort(p.ts))
  const series: EChartsOption['series'] = []

  for (const meta of POLLUTANTS) {
    series.push({
      name: meta.label,
      type: 'line',
      yAxisIndex: 0,
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      showSymbol: false,
      lineStyle: { width: 2.2, color: meta.color },
      itemStyle: { color: meta.color },
      emphasis: { focus: 'series' },
      data: props.series.map((p) => Number(p[STD_KEY[meta.code]])),
    })
    series.push({
      name: `${meta.label}标准`,
      type: 'line',
      yAxisIndex: 0,
      symbol: 'none',
      silent: true,
      lineStyle: { width: 1, type: 'dashed', opacity: 0.34, color: meta.color },
      data: props.series.map(() => props.limits[meta.code]),
      tooltip: { show: false },
    })
  }

  if (props.showParams) {
    series.push({
      name: '炉温',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color: PARAM_COLOR.furnace, type: 'dotted' },
      itemStyle: { color: PARAM_COLOR.furnace },
      data: props.series.map((p) => p.furnace_temp),
    })
    series.push({
      name: '烟气流量',
      type: 'line',
      yAxisIndex: 2,
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 1.6, color: PARAM_COLOR.flow, opacity: 0.85 },
      itemStyle: { color: PARAM_COLOR.flow },
      areaStyle: { color: 'rgba(14,165,233,0.06)' },
      data: props.series.map((p) => p.flow),
    })
  }

  const legendData = [...POLLUTANTS.map((p) => p.label), ...(props.showParams ? ['炉温', '烟气流量'] : [])]

  const yAxis: EChartsOption['yAxis'] = [
    {
      type: 'value',
      name: 'mg/m³',
      nameLocation: 'middle',
      nameGap: 40,
      nameRotate: 90,
      nameTextStyle: { color: '#8ba49d', fontSize: 11 },
      axisLabel: { color: '#8ba49d', fontSize: 11 },
      splitLine: { lineStyle: { color: '#eef3f1' } },
    },
  ]
  if (props.showParams) {
    yAxis.push(
      {
        type: 'value',
        name: '℃',
        position: 'right',
        nameTextStyle: { color: PARAM_COLOR.furnace, fontSize: 11 },
        axisLabel: { color: PARAM_COLOR.furnace, fontSize: 10 },
        axisLine: { show: true, lineStyle: { color: PARAM_COLOR.furnace } },
        splitLine: { show: false },
        scale: true,
      },
      {
        type: 'value',
        name: 'm³/h',
        position: 'right',
        offset: 46,
        nameTextStyle: { color: PARAM_COLOR.flow, fontSize: 11 },
        axisLabel: { color: PARAM_COLOR.flow, fontSize: 10, formatter: (v: number) => `${Math.round(v / 1000)}k` },
        axisLine: { show: true, lineStyle: { color: PARAM_COLOR.flow } },
        splitLine: { show: false },
        scale: true,
      },
    )
  }

  return {
    color: POLLUTANTS.map((p) => p.color),
    grid: { left: 52, right: props.showParams ? 96 : 18, top: 54, bottom: 34 },
    legend: {
      type: 'scroll',
      data: legendData,
      top: 8,
      left: 'center',
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 4,
      itemGap: 14,
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
      formatter: tooltipFormatter,
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
    yAxis,
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

watch(() => [props.series, props.limits, props.showParams], render, { deep: true })

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
<template>
  <div ref="chartEl" class="trend-chart" :style="{ height: height }"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

const props = withDefaults(
  defineProps<{
    series: { name: string; data: [string, number][]; dashed?: boolean; type?: 'line' | 'bar' }[]
    yAxis?: { name: string; max?: number }[]
    height?: string
    dark?: boolean
    area?: { name: string; data: [string, number][] }[]
  }>(),
  { height: '320px', dark: false },
)

const chartEl = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

function render() {
  if (!chart) return
  const series: any[] = props.series.map((s) => ({
    name: s.name,
    type: s.type || 'line',
    smooth: true,
    symbol: 'none',
    lineStyle: s.dashed ? { type: 'dashed', width: 2 } : { width: 2 },
    data: s.data,
  }))
  if (props.area) {
    for (const a of props.area) {
      series.push({
        name: a.name,
        type: 'line',
        stack: 'band',
        symbol: 'none',
        silent: true,
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0.18 },
        data: a.data,
      })
    }
  }
  chart.setOption(
    {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { top: 0, textStyle: { color: props.dark ? '#c8d3dc' : '#606266' } },
      grid: { left: 50, right: 50, top: 34, bottom: 30 },
      xAxis: { type: 'time', axisLabel: { color: props.dark ? '#7d93a8' : '#909399', formatter: '{HH}:{mm}' } },
      yAxis: (props.yAxis || [{ name: '' }]).map((y, i) => ({
        type: 'value',
        name: y.name,
        max: y.max,
        position: i === 0 ? 'left' : 'right',
        axisLabel: { color: props.dark ? '#7d93a8' : '#909399' },
        splitLine: { lineStyle: { color: props.dark ? '#24405a' : '#ebeef5' } },
      })),
      series,
    },
    true,
  )
}

onMounted(() => {
  chart = echarts.init(chartEl.value!)
  render()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
})

function resize() {
  chart?.resize()
}

watch(() => props.series, render, { deep: true })
</script>

<style scoped>
.trend-chart { width: 100%; }
</style>

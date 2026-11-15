<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { GaugeChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

echarts.use([GaugeChart, CanvasRenderer])

const props = withDefaults(defineProps<{ score: number | null; size?: number }>(), { size: 200 })

const el = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let ro: ResizeObserver | null = null

function buildOption(): EChartsOption {
  const has = props.score != null
  return {
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        radius: '95%',
        progress: { show: false },
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [0.6, '#ef4444'],
              [0.8, '#f59e0b'],
              [1, '#16a34a'],
            ],
          },
        },
        pointer: { show: has, length: '60%', width: 5, itemStyle: { color: '#10312c' } },
        axisTick: { show: false },
        splitLine: { length: 8, lineStyle: { width: 2, color: '#c5d8d2' } },
        axisLabel: { distance: 20, color: '#8ba49d', fontSize: 10 },
        anchor: { show: has, size: 12, itemStyle: { color: '#10312c' } },
        title: { show: true, offsetCenter: [0, '72%'], color: '#8ba49d', fontSize: 12 },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '40%'],
          fontSize: 34,
          fontWeight: 800,
          color: '#10312c',
          formatter: has ? '{value}' : '未评分',
        },
        data: [{ value: has ? props.score : 0, name: has ? '健康分' : '' }],
      },
    ],
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
watch(() => props.score, render)
onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="el" class="health-gauge" :style="{ width: size + 'px', height: size + 'px' }"></div>
</template>

<style scoped>
.health-gauge {
  margin: 0 auto;
}
</style>
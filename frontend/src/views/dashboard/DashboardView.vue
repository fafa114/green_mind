<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import MetricCard from '@/components/MetricCard.vue'
import TrendChart from '@/components/TrendChart.vue'
import AlarmBanner from '@/components/AlarmBanner.vue'
import ReplayControls from '@/components/ReplayControls.vue'
import { fetchDevices, fetchLatest, fetchHistory } from '@/api/data'
import {
  POLLUTANTS,
  CONDITION_LABEL,
  type DeviceOption,
  type LatestObservation,
  type HistoryPoint,
  type PollutantCode,
} from '@/api/types'
import { formatNumber, formatDateTime, toISO8601 } from '@/utils/format'

const STD: Record<PollutantCode, keyof LatestObservation> = {
  pm: 'pm_std', so2: 'so2_std', nox: 'nox_std', co: 'co_std', hcl: 'hcl_std',
}
const REAL: Record<PollutantCode, keyof LatestObservation> = {
  pm: 'pm_real', so2: 'so2_real', nox: 'nox_real', co: 'co_real', hcl: 'hcl_real',
}
const LIMIT: Record<PollutantCode, keyof LatestObservation> = {
  pm: 'pm_limit', so2: 'so2_limit', nox: 'nox_limit', co: 'co_limit', hcl: 'hcl_limit',
}

const devices = ref<DeviceOption[]>([])
const deviceId = ref('')
const latest = ref<LatestObservation | null>(null)
const history = ref<HistoryPoint[]>([])
const loading = ref(false)
const error = ref('')

// 回放状态
const replayStart = ref('')
const replayEnd = ref('')
const replayCurrent = ref('')
const playing = ref(false)
const speed = ref(1)
let playTimer: number | undefined
let seekTimer: number | undefined

const currentDevice = computed(() => devices.value.find((d) => d.device_id === deviceId.value))
const conditionLabel = computed(() => (latest.value ? CONDITION_LABEL[latest.value.condition_flag] : '—'))
const conditionTone = computed(() => latest.value?.condition_flag ?? 'normal')

const pollutantCards = computed(() =>
  POLLUTANTS.map((m) => ({
    ...m,
    value: latest.value ? Number(latest.value[STD[m.code]]) : null,
    limit: latest.value ? Number(latest.value[LIMIT[m.code]]) : null,
    measured: latest.value ? Number(latest.value[REAL[m.code]]) : null,
  })),
)

const limits = computed<Record<PollutantCode, number>>(() => {
  const l = latest.value
  return {
    pm: l?.pm_limit ?? 20, so2: l?.so2_limit ?? 80, nox: l?.nox_limit ?? 250,
    co: l?.co_limit ?? 80, hcl: l?.hcl_limit ?? 50,
  }
})

const exceedCount = computed(() => {
  const l = latest.value
  if (!l) return 0
  return POLLUTANTS.filter((m) => Number(l[STD[m.code]]) >= Number(l[LIMIT[m.code]])).length
})

const qualityChips = computed(() => {
  const l = latest.value
  if (!l) return []
  return [
    { label: l.report_flag === 1 ? '上报正常' : '上报异常', tone: l.report_flag === 1 ? 'ok' : 'bad' },
    { label: l.comm_flag === 0 ? '通讯正常' : '通讯中断', tone: l.comm_flag === 0 ? 'ok' : 'bad' },
    { label: l.exceed_flag === 1 ? '来源超标' : '无超标', tone: l.exceed_flag === 1 ? 'warn' : 'ok' },
    { label: l.zero_flag === 1 ? '含零值' : '无零值', tone: l.zero_flag === 1 ? 'warn' : 'ok' },
  ]
})

const flueParams = computed(() => {
  const l = latest.value
  return [
    { label: '氧含量', value: l?.o2 ?? null, unit: '%' },
    { label: '烟气温度', value: l?.flue_temp ?? null, unit: '℃' },
    { label: '烟气流速', value: l?.flue_velocity ?? null, unit: 'm/s' },
    { label: '烟气湿度', value: l?.flue_humidity ?? null, unit: '%' },
    { label: '烟气压力', value: l?.flue_pressure ?? null, unit: 'Pa' },
  ]
})

function scheduleLatest(asOf: string): void {
  if (seekTimer !== undefined) window.clearTimeout(seekTimer)
  seekTimer = window.setTimeout(async () => {
    if (!deviceId.value) return
    try {
      latest.value = await fetchLatest(deviceId.value, asOf)
    } catch {
      // 回放取数失败保留上一帧，不崩溃
    }
  }, 140)
}

function onSeek(iso: string): void {
  replayCurrent.value = iso
  scheduleLatest(iso)
}

function stopPlay(): void {
  if (playTimer !== undefined) {
    window.clearInterval(playTimer)
    playTimer = undefined
  }
}

function startPlay(): void {
  stopPlay()
  // 若停在末尾，先回到起点再播放，避免一开始就越界停止
  if (new Date(replayCurrent.value).getTime() >= new Date(replayEnd.value).getTime()) {
    replayCurrent.value = replayStart.value
    scheduleLatest(replayStart.value)
  }
  playTimer = window.setInterval(() => {
    const endMs = new Date(replayEnd.value).getTime()
    const next = new Date(replayCurrent.value).getTime() + speed.value * 60000
    if (next >= endMs) {
      replayCurrent.value = replayEnd.value
      playing.value = false
      scheduleLatest(replayEnd.value)
      return
    }
    const iso = toISO8601(new Date(next))
    replayCurrent.value = iso
    scheduleLatest(iso)
  }, 1000)
}

watch(playing, (v) => {
  if (v) startPlay()
  else stopPlay()
})
watch(speed, () => {
  if (playing.value) startPlay()
})

async function loadDevices(): Promise<void> {
  try {
    devices.value = await fetchDevices()
    if (!deviceId.value && devices.value.length > 0) deviceId.value = devices.value[0].device_id
  } catch (e) {
    error.value = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '设备列表加载失败'
  }
}

async function loadBase(): Promise<void> {
  if (!deviceId.value) return
  loading.value = true
  error.value = ''
  playing.value = false
  try {
    const end = new Date()
    const start = new Date(end.getTime() - 24 * 3600 * 1000)
    const h = await fetchHistory(deviceId.value, toISO8601(start), toISO8601(end), 'hour')
    history.value = h.items
    if (h.items.length > 0) {
      replayStart.value = h.items[0].ts
      replayEnd.value = h.items[h.items.length - 1].ts
      replayCurrent.value = replayEnd.value
    }
    latest.value = await fetchLatest(deviceId.value)
  } catch (e) {
    error.value = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail || '数据加载失败，请稍后重试'
    latest.value = null
    history.value = []
  } finally {
    loading.value = false
  }
}

async function refresh(): Promise<void> {
  await loadBase()
  if (!error.value) ElMessage.success('数据已刷新')
}

watch(deviceId, () => {
  void loadBase()
})

onMounted(() => {
  void loadDevices()
})

onBeforeUnmount(() => {
  stopPlay()
  if (seekTimer !== undefined) window.clearTimeout(seekTimer)
})
</script>

<template>
  <div class="dash">
    <AlarmBanner />

    <header class="dash-head gm-fade-up">
      <div class="head-title">
        <p class="eyebrow">监控大屏 · 历史回放</p>
        <h1>排放监控</h1>
      </div>
      <div class="head-tools">
        <el-select v-model="deviceId" size="large" placeholder="选择设备" class="dev-select" :loading="loading">
          <el-option v-for="d in devices" :key="d.device_id" :label="`${d.device_id} · ${d.name}`" :value="d.device_id" />
        </el-select>
        <el-button size="large" class="refresh-btn" :loading="loading" @click="refresh">
          <AppIcon v-if="!loading" name="refresh" :size="17" /><span style="margin-left: 6px">刷新</span>
        </el-button>
      </div>
    </header>

    <el-alert v-if="error" :title="error" type="error" show-icon class="dash-err">
      <el-button size="small" type="primary" plain @click="loadBase">重试</el-button>
    </el-alert>

    <ReplayControls
      v-if="replayStart && replayEnd"
      :start="replayStart"
      :end="replayEnd"
      :current="replayCurrent"
      :playing="playing"
      :speed="speed"
      class="gm-fade-up"
      @update:current="onSeek"
      @update:playing="playing = $event"
      @update:speed="speed = $event"
    />

    <section v-loading="loading && !latest" class="overview gm-surface gm-fade-up">
      <div class="ov-device">
        <span class="ov-ico"><AppIcon name="device" :size="22" /></span>
        <div class="ov-device-text">
          <strong>{{ currentDevice?.name ?? '—' }}</strong>
          <small>{{ deviceId || '—' }} · 数据时间 {{ formatDateTime(latest?.ts) }}</small>
        </div>
      </div>
      <span class="cond-badge" :class="conditionTone">
        <span v-if="conditionTone === 'normal'" class="gm-live-dot"></span>
        工况 · {{ conditionLabel }}
      </span>
      <div class="ov-stats">
        <div class="ov-stat">
          <span class="ov-num gm-num" :class="{ bad: exceedCount > 0 }">{{ exceedCount }}</span>
          <span class="ov-lbl">超标污染物</span>
        </div>
        <div class="ov-stat">
          <span class="ov-num gm-num">{{ history.length }}</span>
          <span class="ov-lbl">趋势样本</span>
        </div>
        <div class="ov-stat">
          <span class="ov-num gm-num">{{ speed }}×</span>
          <span class="ov-lbl">回放倍速</span>
        </div>
      </div>
    </section>

    <div v-loading="loading" class="dash-grid">
      <div class="dash-main">
        <section class="cards">
          <MetricCard
            v-for="c in pollutantCards"
            :key="c.code"
            :label="c.label"
            :formula="c.formula"
            :value="c.value"
            :limit="c.limit"
            :measured="c.measured"
            :unit="c.unit"
            :color="c.color"
          />
          <MetricCard
            label="炉温"
            formula="T"
            :value="latest?.furnace_temp ?? null"
            unit="℃"
            color="#f59e0b"
            :reference="900"
            reference-label="额定"
          />
          <MetricCard
            label="烟气流量"
            formula="Q"
            :value="latest?.flow ?? null"
            unit="m³/h"
            color="#0ea5e9"
            :reference="32000"
            reference-label="额定"
          />
        </section>

        <section class="trend gm-surface gm-fade-up">
          <div class="panel-head">
            <div>
              <h2>24 小时趋势</h2>
              <p>五污染物折算浓度 + 标准虚线 · 炉温/流量双轴</p>
            </div>
            <span class="panel-tag">interval = hour</span>
          </div>
          <TrendChart :series="history" :limits="limits" :height="360" :show-params="true" />
        </section>
      </div>

      <aside class="dash-side">
        <section class="panel gm-surface gm-fade-up">
          <div class="panel-head"><h2>烟气参数</h2></div>
          <ul class="params">
            <li v-for="row in flueParams" :key="row.label">
              <span class="p-lbl">{{ row.label }}</span>
              <span class="p-val gm-num">{{ formatNumber(row.value) }}<small>{{ row.unit }}</small></span>
            </li>
          </ul>
        </section>

        <section class="panel gm-surface gm-fade-up">
          <div class="panel-head"><h2>数据质量标记</h2></div>
          <div class="q-chips">
            <span v-for="chip in qualityChips" :key="chip.label" class="q-chip" :class="chip.tone">
              <AppIcon :name="chip.tone === 'ok' ? 'check' : 'alert'" :size="13" :stroke-width="2.4" />
              {{ chip.label }}
            </span>
          </div>
          <p class="src-note">来源标记原样保留；超标为运维提示，非监管合规判定。回放保留原始采样时间。</p>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.dash {
  display: grid;
  gap: 18px;
}
.dash-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}
.eyebrow {
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gm-primary);
  font-weight: 700;
  margin: 0 0 6px;
}
.head-title h1 {
  margin: 0;
  font-size: 27px;
  font-weight: 800;
  color: var(--gm-ink);
}
.head-tools {
  display: flex;
  gap: 12px;
  align-items: center;
}
.dev-select {
  width: 260px;
}
.dev-select :deep(.el-select__wrapper) {
  border-radius: 11px;
  box-shadow: 0 0 0 1px var(--gm-line) inset;
}
.refresh-btn {
  border-radius: 11px;
  border-color: var(--gm-line);
  color: var(--gm-ink-soft);
}
.dash-err {
  border-radius: 12px;
}
.overview {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 18px 24px;
  flex-wrap: wrap;
}
.ov-device {
  display: flex;
  align-items: center;
  gap: 14px;
}
.ov-ico {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 13px;
  color: var(--gm-primary);
  background: var(--gm-primary-soft);
}
.ov-device-text {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}
.ov-device-text strong {
  font-size: 17px;
  color: var(--gm-ink);
}
.ov-device-text small {
  font-size: 12.5px;
  color: var(--gm-ink-faint);
}
.cond-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 15px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}
.cond-badge.normal { color: var(--gm-green); background: rgba(22, 163, 74, 0.12); }
.cond-badge.startup { color: var(--gm-blue); background: rgba(14, 165, 233, 0.12); }
.cond-badge.shutdown { color: var(--gm-ink-soft); background: var(--gm-surface-3); }
.cond-badge.fault { color: var(--gm-red); background: rgba(239, 68, 68, 0.12); }
.ov-stats {
  margin-left: auto;
  display: flex;
  gap: 30px;
}
.ov-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
}
.ov-num {
  font-size: 26px;
  font-weight: 800;
  color: var(--gm-primary);
}
.ov-num.bad {
  color: var(--gm-red);
}
.ov-lbl {
  font-size: 12px;
  color: var(--gm-ink-faint);
  margin-top: 2px;
}
.dash-grid {
  display: grid;
  grid-template-columns: minmax(0, 2.1fr) minmax(280px, 1fr);
  gap: 18px;
  align-items: start;
}
.dash-main {
  display: grid;
  gap: 18px;
  min-width: 0;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
  gap: 14px;
}
.trend {
  padding: 20px 22px;
}
.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.panel-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--gm-ink);
}
.panel-head p {
  margin: 3px 0 0;
  font-size: 12.5px;
  color: var(--gm-ink-faint);
}
.panel-tag {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--gm-primary);
  background: var(--gm-primary-soft);
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.dash-side {
  display: grid;
  gap: 18px;
}
.panel {
  padding: 20px 22px;
}
.params {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 2px;
}
.params li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 0;
  border-bottom: 1px dashed var(--gm-line-soft);
}
.params li:last-child {
  border-bottom: none;
}
.p-lbl {
  font-size: 13px;
  color: var(--gm-ink-soft);
}
.p-val {
  font-size: 15px;
  font-weight: 700;
  color: var(--gm-ink);
}
.p-val small {
  font-size: 11px;
  font-weight: 500;
  color: var(--gm-ink-faint);
  margin-left: 4px;
}
.q-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.q-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
}
.q-chip.ok { color: var(--gm-green); background: rgba(22, 163, 74, 0.12); }
.q-chip.warn { color: var(--gm-amber); background: rgba(245, 158, 11, 0.14); }
.q-chip.bad { color: var(--gm-red); background: rgba(239, 68, 68, 0.12); }
.src-note {
  margin: 16px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--gm-ink-faint);
}
@media (max-width: 1100px) {
  .dash-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .head-tools {
    width: 100%;
  }
  .dev-select {
    flex: 1;
    width: auto;
  }
  .ov-stats {
    margin-left: 0;
    width: 100%;
    justify-content: space-between;
  }
}
</style>
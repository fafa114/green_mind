<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import LevelTag from '@/components/LevelTag.vue'
import PageTable from '@/components/PageTable.vue'
import AlarmDetail from '@/components/AlarmDetail.vue'
import { fetchAlarms, fetchAlarm, ackAlarm } from '@/api/alarm'
import { fetchDevices } from '@/api/data'
import { useAlarmStore } from '@/stores/alarm'
import {
  ALARM_STATUS_LABEL,
  POLLUTANT_LABEL,
  type Alarm,
  type AlarmFilters,
  type AlarmLevel,
  type AlarmStatus,
  type DeviceOption,
} from '@/api/types'
import { formatDateTime, formatNumber } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const alarmStore = useAlarmStore()

const devices = ref<DeviceOption[]>([])
const filters = reactive({
  level: '' as AlarmLevel | '',
  status: '' as AlarmStatus | '',
  device_id: '',
  range: [] as string[],
})
const page = ref(1)
const pageSize = ref(20)
const rows = ref<Alarm[]>([])
const total = ref(0)
const loading = ref(false)
const detailVisible = ref(false)
const current = ref<Alarm | null>(null)

async function load(): Promise<void> {
  loading.value = true
  try {
    const f: AlarmFilters = {
      level: filters.level,
      status: filters.status,
      device_id: filters.device_id || undefined,
      page: page.value,
      page_size: pageSize.value,
    }
    if (filters.range && filters.range.length === 2) {
      f.start = filters.range[0]
      f.end = filters.range[1]
    }
    const res = await fetchAlarms(f)
    rows.value = res.items
    total.value = res.total
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '告警加载失败')
  } finally {
    loading.value = false
  }
}

const liveMatching = computed(() =>
  alarmStore.liveAlarms.filter((a) => {
    if (filters.level && a.level !== filters.level) return false
    if (filters.status && a.status !== filters.status) return false
    if (filters.device_id && a.device_id !== filters.device_id) return false
    return true
  }),
)

const displayRows = computed(() => {
  const ids = new Set(rows.value.map((r) => r.id))
  const extra = liveMatching.value.filter((a) => !ids.has(a.id))
  return [...extra, ...rows.value]
})

function applyFilter(): void {
  page.value = 1
  void load()
}
function resetFilter(): void {
  filters.level = ''
  filters.status = ''
  filters.device_id = ''
  filters.range = []
  page.value = 1
  void load()
}
function onPage(p: { page: number; pageSize: number }): void {
  page.value = p.page
  pageSize.value = p.pageSize
  void load()
}

async function openDetail(row: Alarm): Promise<void> {
  current.value = row
  detailVisible.value = true
  try {
    current.value = await fetchAlarm(row.id)
  } catch {
    // 实时告警尚未持久化：保留流事件构造的行
  }
}

async function onAck(id: number): Promise<void> {
  try {
    current.value = await ackAlarm(id)
    ElMessage.success('告警已确认')
    await load()
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '确认失败')
  }
}

function onViewWorkorder(id: number): void {
  detailVisible.value = false
  router.push({ path: '/workorders', query: { focus: String(id) } })
}

function focusFromQuery(): void {
  const focus = route.query.focus
  if (!focus) return
  const id = Number(focus)
  const found = displayRows.value.find((a) => a.id === id) || alarmStore.liveAlarms.find((a) => a.id === id)
  if (found) void openDetail(found)
}

watch(() => route.query.focus, focusFromQuery)

onMounted(async () => {
  devices.value = await fetchDevices().catch(() => [])
  await load()
  focusFromQuery()
})
</script>

<template>
  <div class="alarms">
    <header class="page-head gm-fade-up">
      <div>
        <p class="eyebrow">告警中心</p>
        <h1>告警列表</h1>
      </div>
      <div class="head-right">
        <span class="live-pill" :class="{ on: alarmStore.connected }">
          <span class="gm-live-dot"></span>
          {{ alarmStore.connected ? '实时监听中' : '未连接' }}
        </span>
        <el-button class="refresh-btn" :loading="loading" @click="load">
          <AppIcon v-if="!loading" name="refresh" :size="16" /><span style="margin-left: 6px">刷新</span>
        </el-button>
      </div>
    </header>

    <section class="filter-bar gm-surface gm-fade-up">
      <el-select v-model="filters.level" placeholder="级别" clearable class="f-item" @change="applyFilter">
        <el-option label="黄色" value="yellow" />
        <el-option label="橙色" value="orange" />
        <el-option label="红色" value="red" />
      </el-select>
      <el-select v-model="filters.status" placeholder="状态" clearable class="f-item" @change="applyFilter">
        <el-option label="待处理" value="pending" />
        <el-option label="已确认" value="acked" />
        <el-option label="已关闭" value="closed" />
      </el-select>
      <el-select v-model="filters.device_id" placeholder="设备" clearable class="f-item" @change="applyFilter">
        <el-option v-for="d in devices" :key="d.device_id" :label="d.device_id" :value="d.device_id" />
      </el-select>
      <el-date-picker
        v-model="filters.range"
        type="datetimerange"
        range-separator="至"
        start-placeholder="开始时间"
        end-placeholder="结束时间"
        value-format="YYYY-MM-DDTHH:mm:ss"
        class="f-range"
        @change="applyFilter"
      />
      <el-button type="primary" @click="applyFilter">
        <AppIcon name="search" :size="16" /><span style="margin-left: 6px">查询</span>
      </el-button>
      <el-button @click="resetFilter">重置</el-button>
    </section>

    <PageTable
      :data="displayRows"
      :total="total"
      :page="page"
      :page-size="pageSize"
      :loading="loading"
      class="gm-fade-up"
      @change="onPage"
      @row-click="openDetail"
    >
      <el-table-column label="级别" width="100">
        <template #default="{ row }"><LevelTag :level="row.level" /></template>
      </el-table-column>
      <el-table-column prop="device_id" label="设备" width="110" />
      <el-table-column label="污染物" width="110">
        <template #default="{ row }">{{ POLLUTANT_LABEL[row.pollutant as keyof typeof POLLUTANT_LABEL] }}</template>
      </el-table-column>
      <el-table-column label="当前 / 标准" width="140">
        <template #default="{ row }">
          <span class="gm-num" :class="{ over: row.value >= row.limit_val }">
            {{ formatNumber(row.value) }} / {{ formatNumber(row.limit_val) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="220" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <span class="status-tag" :class="row.status">{{ ALARM_STATUS_LABEL[row.status as keyof typeof ALARM_STATUS_LABEL] }}</span>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="170">
        <template #default="{ row }"><span class="gm-num">{{ formatDateTime(row.ts) }}</span></template>
      </el-table-column>
      <el-table-column label="" width="70" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click.stop="openDetail(row)">查看</el-button>
        </template>
      </el-table-column>
      <template #empty>
        <div class="empty-state">
          <AppIcon name="alarm" :size="30" />
          <p>暂无符合条件的告警</p>
        </div>
      </template>
    </PageTable>

    <AlarmDetail
      :alarm="current"
      :visible="detailVisible"
      @update:visible="detailVisible = $event"
      @ack="onAck"
      @view-workorder="onViewWorkorder"
    />
  </div>
</template>

<style scoped>
.alarms {
  display: grid;
  gap: 18px;
}
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
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
.page-head h1 {
  margin: 0;
  font-size: 27px;
  font-weight: 800;
  color: var(--gm-ink);
}
.head-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 999px;
  color: var(--gm-ink-faint);
  background: var(--gm-surface-3);
}
.live-pill.on {
  color: var(--gm-green);
  background: rgba(22, 163, 74, 0.12);
}
.refresh-btn {
  border-radius: 11px;
  border-color: var(--gm-line);
  color: var(--gm-ink-soft);
}
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  flex-wrap: wrap;
}
.f-item {
  width: 130px;
}
.f-range {
  flex: 1;
  min-width: 280px;
}
.gm-num.over {
  color: var(--gm-red);
  font-weight: 700;
}
.status-tag {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
}
.status-tag.pending { color: var(--gm-amber); background: rgba(245, 158, 11, 0.14); }
.status-tag.acked { color: var(--gm-blue); background: rgba(14, 165, 233, 0.12); }
.status-tag.closed { color: var(--gm-green); background: rgba(22, 163, 74, 0.12); }
.empty-state {
  display: grid;
  place-items: center;
  gap: 8px;
  padding: 30px 0;
  color: var(--gm-ink-faint);
}
.empty-state p {
  margin: 0;
  font-size: 13px;
}
:deep(.el-table__row) {
  cursor: pointer;
}
@media (max-width: 640px) {
  .f-item {
    width: calc(50% - 6px);
  }
  .f-range {
    min-width: 100%;
  }
}
</style>
<template>
  <div>
    <div class="toolbar">
      <el-button v-if="userStore.isAdmin" type="primary" size="small" @click="openCreate">新增设备</el-button>
      <el-button size="small" @click="load">刷新</el-button>
    </div>

    <PageTable :data="page" :query="query" :loading="loading" @change="load">
      <el-table-column label="编号" prop="code" width="110" />
      <el-table-column label="名称" prop="name" min-width="160" />
      <el-table-column label="类型" prop="type" width="110" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 'running' ? 'success' : row.status === 'maintenance' ? 'warning' : 'info'">
            {{ { running: '运行', stopped: '停用', maintenance: '维护' }[row.status as string] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="健康度" width="200">
        <template #default="{ row }">
          <el-progress
            :percentage="row.latest_health ?? 0"
            :stroke-width="12"
            :color="healthColor(row.latest_health)"
            :format="(v: number) => (row.latest_health == null ? '未评估' : String(v))"
            style="width: 150px"
          />
        </template>
      </el-table-column>
      <el-table-column label="安装日期" width="120">
        <template #default="{ row }">{{ fmtDate(row.install_date) }}</template>
      </el-table-column>
      <el-table-column label="上次校准" width="120">
        <template #default="{ row }">{{ fmtDate(row.last_calibration_date) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button link type="primary" @click="openHealth(row)">健康详情</el-button>
          <el-button v-if="userStore.isAdmin" link type="warning" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="userStore.isAdmin" link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </PageTable>

    <el-dialog v-model="formVisible" :title="editing ? '编辑设备' : '新增设备'" width="480px">
      <el-form label-width="110px">
        <el-form-item label="编号"><el-input v-model="form.code" :disabled="!!editing" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="类型"><el-input v-model="form.type" /></el-form-item>
        <el-form-item label="安装日期"><el-date-picker v-model="form.install_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="设计寿命(年)"><el-input-number v-model="form.design_life_years" :min="1" :max="50" style="width: 100%" /></el-form-item>
        <el-form-item label="上次校准"><el-date-picker v-model="form.last_calibration_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="校准周期(天)"><el-input-number v-model="form.calibration_cycle_days" :min="30" :max="720" style="width: 100%" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="运行" value="running" /><el-option label="停用" value="stopped" /><el-option label="维护" value="maintenance" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="healthVisible" title="设备健康度" size="420px">
      <template v-if="healthDevice">
        <div class="h-dev">{{ healthDevice.code }} {{ healthDevice.name }}</div>
        <div ref="gaugeEl" class="gauge"></div>
        <template v-if="health">
          <div class="h-sec">评估因素</div>
          <div v-for="(f, i) in health.factors || []" :key="i" class="h-factor">
            <b>{{ f.name }}</b>：{{ f.impact }}
          </div>
          <div class="h-sec">建议</div>
          <p>{{ health.suggestion || '（无）' }}</p>
          <div class="h-sec">评估时间</div>
          <p>{{ fmtTime(health.scored_at) }}</p>
        </template>
        <el-empty v-else description="尚无评分" :image-size="70" />
        <el-button v-if="userStore.isAdmin" type="primary" :loading="refreshing" @click="refreshHealth(healthDevice)">
          {{ health ? '重新评分' : '立即评分' }}
        </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'
import PageTable from '../../components/PageTable.vue'
import { createDevice, deleteDevice, getDeviceHealth, listDevices, refreshDeviceHealth, updateDevice } from '../../api/devices'
import { useUserStore } from '../../stores/user'
import type { Device, HealthScore, Page } from '../../types'
import { fmtDate, fmtTime } from '../../utils/format'

const userStore = useUserStore()
const query = reactive({ page: 1, page_size: 20 })
const page = ref<Page<Device>>({ items: [], total: 0, page: 1, page_size: 20 })
const loading = ref(false)

const formVisible = ref(false)
const editing = ref<Device | null>(null)
const form = reactive({ code: '', name: '', type: '', install_date: '', design_life_years: 10, last_calibration_date: '', calibration_cycle_days: 365, status: 'running' })

const healthVisible = ref(false)
const healthDevice = ref<Device | null>(null)
const health = ref<HealthScore | null>(null)
const refreshing = ref(false)
const gaugeEl = ref<HTMLElement>()
let gauge: echarts.ECharts | null = null

function healthColor(score?: number | null) {
  if (score == null) return '#c0c4cc'
  if (score >= 80) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}

async function load(q = query) {
  loading.value = true
  try {
    page.value = await listDevices(q)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, { code: '', name: '', type: '', install_date: '', design_life_years: 10, last_calibration_date: '', calibration_cycle_days: 365, status: 'running' })
  formVisible.value = true
}

function openEdit(row: Device) {
  editing.value = row
  Object.assign(form, {
    code: row.code, name: row.name, type: row.type || '', install_date: row.install_date || '',
    design_life_years: row.design_life_years ?? 10, last_calibration_date: row.last_calibration_date || '',
    calibration_cycle_days: row.calibration_cycle_days, status: row.status,
  })
  formVisible.value = true
}

async function save() {
  const body: Record<string, any> = { ...form }
  if (!body.install_date) body.install_date = null
  if (!body.last_calibration_date) body.last_calibration_date = null
  if (editing.value) {
    delete body.code
    await updateDevice(editing.value.id, body)
  } else {
    await createDevice(body)
  }
  formVisible.value = false
  ElMessage.success('已保存')
  load()
}

async function remove(row: Device) {
  await ElMessageBox.confirm(`确认删除设备 ${row.code} ${row.name}？`, '删除确认', { type: 'warning' })
  await deleteDevice(row.id)
  ElMessage.success('已删除')
  load()
}

async function openHealth(row: Device) {
  healthDevice.value = row
  health.value = null
  healthVisible.value = true
  try {
    health.value = await getDeviceHealth(row.id)
  } catch { /* 尚无评分 */ }
  nextTick(renderGauge)
}

function renderGauge() {
  if (!gaugeEl.value) return
  if (!gauge) gauge = echarts.init(gaugeEl.value)
  const score = health.value?.score ?? 0
  gauge.setOption({
    series: [{
      type: 'gauge', startAngle: 200, endAngle: -20, min: 0, max: 100,
      progress: { show: true, width: 14, itemStyle: { color: healthColor(score || null) } },
      axisLine: { lineStyle: { width: 14, color: [[1, '#ebeef5']] } },
      pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      detail: { valueAnimation: true, fontSize: 34, offsetCenter: [0, '10%'], formatter: '{value}', color: healthColor(score || null) },
      data: [{ value: health.value ? score : 0 }],
    }],
  })
}

async function refreshHealth(device: Device) {
  refreshing.value = true
  try {
    health.value = await refreshDeviceHealth(device.id)
    renderGauge()
    load()
  } finally {
    refreshing.value = false
  }
}

onMounted(load)
onBeforeUnmount(() => gauge?.dispose())
</script>

<style scoped>
.toolbar { display: flex; gap: 10px; margin-bottom: 12px; background: #fff; padding: 10px 12px; border-radius: 6px; }
.h-dev { font-weight: 700; font-size: 15px; margin-bottom: 10px; }
.gauge { height: 220px; }
.h-sec { font-weight: 700; margin: 14px 0 6px; }
.h-factor { margin-bottom: 6px; font-size: 14px; }
</style>

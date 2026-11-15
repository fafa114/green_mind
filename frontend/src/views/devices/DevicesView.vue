<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import PageTable from '@/components/PageTable.vue'
import HealthGauge from '@/components/HealthGauge.vue'
import { fetchDevices, createDevice, updateDevice, removeDevice, fetchHealth, refreshHealth } from '@/api/device'
import { useUserStore } from '@/stores/user'
import { usePermission } from '@/utils/permission'
import { DEVICE_STATUS_LABEL, DEVICE_STATUS_COLOR, type DeviceWithHealth, type Device, type HealthScore } from '@/api/types'
import { formatDateTime } from '@/utils/format'

const user = useUserStore()
const { isAdmin } = usePermission()
const actor = computed(() => ({ id: user.user?.id ?? 0, role: user.role }))

const rows = ref<DeviceWithHealth[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)

const detailVisible = ref(false)
const current = ref<DeviceWithHealth | null>(null)
const health = ref<HealthScore | null>(null)
const healthLoading = ref(false)
const refreshing = ref(false)

const formVisible = ref(false)
const editing = ref<Device | null>(null)
const saving = ref(false)
const form = reactive({
  code: '', name: '', type: '烟气在线监测', install_date: '', design_life_years: 10,
  last_calibration_date: '', calibration_cycle_days: 365, status: 'running' as Device['status'],
})

const overdueDays = computed(() => {
  if (!current.value?.last_calibration_date) return 0
  const last = new Date(current.value.last_calibration_date).getTime()
  const due = last + current.value.calibration_cycle_days * 86400e3
  return Math.max(0, Math.floor((Date.now() - due) / 86400e3))
})

function healthColor(score: number | null): string {
  if (score == null) return '#c5d8d2'
  return score >= 80 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#ef4444'
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const res = await fetchDevices(page.value, pageSize.value)
    rows.value = res.items
    total.value = res.total
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '设备加载失败')
  } finally {
    loading.value = false
  }
}

async function openDetail(row: DeviceWithHealth): Promise<void> {
  current.value = row
  detailVisible.value = true
  health.value = null
  healthLoading.value = true
  try {
    health.value = await fetchHealth(row.id)
  } catch {
    health.value = null
  } finally {
    healthLoading.value = false
  }
}

async function refresh(): Promise<void> {
  if (!current.value) return
  refreshing.value = true
  try {
    health.value = await refreshHealth(current.value.id)
    current.value = { ...current.value, health_score: health.value.score }
    await load()
    ElMessage.success('健康分已刷新')
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '刷新失败')
  } finally {
    refreshing.value = false
  }
}

function openCreate(): void {
  editing.value = null
  Object.assign(form, { code: '', name: '', type: '烟气在线监测', install_date: '', design_life_years: 10, last_calibration_date: '', calibration_cycle_days: 365, status: 'running' })
  formVisible.value = true
}
function openEdit(row: Device): void {
  editing.value = row
  Object.assign(form, { code: row.code, name: row.name, type: row.type, install_date: row.install_date, design_life_years: row.design_life_years, last_calibration_date: row.last_calibration_date, calibration_cycle_days: row.calibration_cycle_days, status: row.status })
  formVisible.value = true
}

async function save(): Promise<void> {
  if (!form.code.trim() || !form.name.trim()) {
    ElMessage.warning('请填写设备编号与名称')
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await updateDevice(editing.value.id, { ...form }, actor.value)
      ElMessage.success('设备已更新')
    } else {
      await createDevice({ ...form }, actor.value)
      ElMessage.success('设备已创建')
    }
    formVisible.value = false
    await load()
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '保存失败')
  } finally {
    saving.value = false
  }
}

async function remove(row: DeviceWithHealth): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除设备「${row.name}」？此操作不可恢复。`, '删除设备', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  } catch {
    return
  }
  try {
    await removeDevice(row.id, actor.value)
    ElMessage.success('设备已删除')
    await load()
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '删除失败')
  }
}

function onPage(p: { page: number; pageSize: number }): void {
  page.value = p.page
  pageSize.value = p.pageSize
  void load()
}

onMounted(load)
</script>

<template>
  <div class="dev">
    <header class="page-head gm-fade-up">
      <div>
        <p class="eyebrow">设备资产</p>
        <h1>设备台账</h1>
      </div>
      <el-button v-if="isAdmin" type="primary" size="large" @click="openCreate">
        <AppIcon name="spark" :size="16" /><span style="margin-left: 6px">新增设备</span>
      </el-button>
    </header>

    <PageTable :data="rows" :total="total" :page="page" :page-size="pageSize" :loading="loading" class="gm-fade-up" @change="onPage" @row-click="openDetail">
      <el-table-column prop="code" label="编号" width="120" />
      <el-table-column prop="name" label="名称" min-width="200" show-overflow-tooltip />
      <el-table-column prop="type" label="类型" width="140" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <span class="dstatus" :style="{ '--sc': DEVICE_STATUS_COLOR[row.status as keyof typeof DEVICE_STATUS_COLOR] }">{{ DEVICE_STATUS_LABEL[row.status as keyof typeof DEVICE_STATUS_LABEL] }}</span>
        </template>
      </el-table-column>
      <el-table-column label="健康分" width="180">
        <template #default="{ row }">
          <div v-if="row.health_score != null" class="health-cell">
            <el-progress :percentage="row.health_score" :color="healthColor(row.health_score)" :stroke-width="9" :show-text="false" />
            <span class="gm-num" :style="{ color: healthColor(row.health_score) }">{{ row.health_score }}</span>
          </div>
          <span v-else class="no-score">未评分</span>
        </template>
      </el-table-column>
      <el-table-column prop="install_date" label="安装日期" width="120" />
      <el-table-column label="操作" width="150" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click.stop="openDetail(row)">详情</el-button>
          <el-button v-if="isAdmin" link type="primary" @click.stop="openEdit(row)">编辑</el-button>
          <el-button v-if="isAdmin" link type="danger" @click.stop="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </PageTable>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" direction="rtl" size="440px" class="dev-drawer">
      <template #header>
        <div class="dd-head"><span>设备详情</span><span v-if="current" class="dd-code gm-num">{{ current.code }}</span></div>
      </template>
      <div v-if="current" class="dd-body">
        <h3 class="dd-name">{{ current.name }}</h3>
        <div class="dd-tags">
          <span class="dstatus" :style="{ '--sc': DEVICE_STATUS_COLOR[current.status] }">{{ DEVICE_STATUS_LABEL[current.status] }}</span>
          <span class="dd-type">{{ current.type }}</span>
        </div>

        <div v-loading="healthLoading" class="gauge-box">
          <HealthGauge :score="health?.score ?? null" :size="210" />
          <el-button type="primary" plain :loading="refreshing" class="refresh-health" @click="refresh">
            <AppIcon v-if="!refreshing" name="refresh" :size="15" /><span style="margin-left: 6px">刷新健康分</span>
          </el-button>
        </div>

        <el-alert v-if="overdueDays > 0" :title="`校准已逾期 ${overdueDays} 天，请尽快安排校准`" type="warning" show-icon :closable="false" />

        <div v-if="health" class="dd-section">
          <span class="sec-label">影响因素</span>
          <ul class="factors">
            <li v-for="(f, i) in health.factors" :key="i">
              <strong>{{ f.name }}</strong><span>{{ f.impact }}</span>
            </li>
          </ul>
        </div>
        <div v-if="health" class="dd-section">
          <span class="sec-label">维护建议</span>
          <p class="suggestion">{{ health.suggestion }}</p>
          <p v-if="health.scored_at" class="scored-at">评分时间：{{ formatDateTime(health.scored_at) }}</p>
        </div>

        <div class="dd-meta">
          <div><span>安装日期</span><b>{{ current.install_date }}</b></div>
          <div><span>设计寿命</span><b>{{ current.design_life_years }} 年</b></div>
          <div><span>上次校准</span><b>{{ current.last_calibration_date }}</b></div>
          <div><span>校准周期</span><b>{{ current.calibration_cycle_days }} 天</b></div>
        </div>
      </div>
    </el-drawer>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="editing ? '编辑设备' : '新增设备'" width="560px" :align-center="true">
      <el-form label-position="top">
        <div class="form-row">
          <el-form-item label="设备编号" required><el-input v-model="form.code" placeholder="如 CEMS-03" /></el-form-item>
          <el-form-item label="设备名称" required><el-input v-model="form.name" placeholder="如 3#排放口 CEMS" /></el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="类型"><el-input v-model="form.type" /></el-form-item>
          <el-form-item label="状态">
            <el-select v-model="form.status" style="width: 100%">
              <el-option label="运行" value="running" /><el-option label="停运" value="stopped" /><el-option label="维护" value="maintenance" />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="安装日期"><el-date-picker v-model="form.install_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
          <el-form-item label="设计寿命（年）"><el-input-number v-model="form.design_life_years" :min="1" :max="50" style="width: 100%" /></el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="上次校准日期"><el-date-picker v-model="form.last_calibration_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
          <el-form-item label="校准周期（天）"><el-input-number v-model="form.calibration_cycle_days" :min="1" :max="1000" style="width: 100%" /></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.dev { display: grid; gap: 18px; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.eyebrow { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gm-primary); font-weight: 700; margin: 0 0 6px; }
.page-head h1 { margin: 0; font-size: 27px; font-weight: 800; color: var(--gm-ink); }
.dstatus { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px; color: var(--sc); background: color-mix(in srgb, var(--sc) 14%, transparent); }
.health-cell { display: flex; align-items: center; gap: 10px; }
.health-cell .el-progress { flex: 1; }
.health-cell span { font-weight: 800; font-size: 14px; }
.no-score { font-size: 12px; color: var(--gm-ink-faint); }
.dd-head { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 800; color: var(--gm-ink); }
.dd-code { font-size: 13px; color: var(--gm-ink-faint); font-weight: 600; }
.dd-body { display: grid; gap: 16px; }
.dd-name { margin: 0; font-size: 20px; font-weight: 800; color: var(--gm-ink); }
.dd-tags { display: flex; gap: 8px; align-items: center; }
.dd-type { font-size: 12.5px; color: var(--gm-ink-soft); }
.gauge-box { display: grid; place-items: center; gap: 8px; padding: 8px 0; }
.refresh-health { border-radius: 10px; }
.dd-section { display: grid; gap: 8px; }
.sec-label { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; color: var(--gm-primary); }
.factors { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.factors li { display: flex; flex-direction: column; gap: 2px; padding: 10px 14px; border-radius: 10px; background: var(--gm-surface-2); }
.factors strong { font-size: 13px; color: var(--gm-ink); }
.factors span { font-size: 12.5px; color: var(--gm-ink-soft); }
.suggestion { margin: 0; font-size: 13.5px; line-height: 1.65; color: var(--gm-ink-soft); padding: 12px 14px; border-radius: 10px; background: var(--gm-primary-soft); }
.scored-at { margin: 0; font-size: 12px; color: var(--gm-ink-faint); }
.dd-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 18px; padding: 14px 16px; border-radius: 12px; background: var(--gm-surface-2); border: 1px solid var(--gm-line-soft); }
.dd-meta div { display: flex; flex-direction: column; line-height: 1.3; }
.dd-meta span { font-size: 11.5px; color: var(--gm-ink-faint); }
.dd-meta b { font-size: 13.5px; color: var(--gm-ink); font-weight: 600; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
:deep(.el-table__row) { cursor: pointer; }
@media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } :deep(.el-drawer) { width: 100% !important; } }
</style>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import PageTable from '@/components/PageTable.vue'
import SlaCountdown from '@/components/SlaCountdown.vue'
import WorkOrderDetail from '@/components/WorkOrderDetail.vue'
import {
  fetchWorkOrders,
  fetchWorkOrderStats,
  createWorkOrder,
} from '@/api/workorder'
import { fetchDevices } from '@/api/data'
import { useUserStore } from '@/stores/user'
import { usePermission } from '@/utils/permission'
import { formatDateTime } from '@/utils/format'
import {
  PRIORITY_LABEL,
  PRIORITY_COLOR,
  WORKORDER_STATUS_LABEL,
  WORKORDER_STATUS_COLOR,
  USER_NAME,
  type WorkOrder,
  type WorkOrderStats,
  type WorkOrderStatus,
  type WorkOrderPriority,
  type DeviceOption,
} from '@/api/types'

const route = useRoute()
const user = useUserStore()
const { canWrite } = usePermission()

const viewMode = ref<'kanban' | 'table'>('kanban')
const orders = ref<WorkOrder[]>([])
const stats = ref<WorkOrderStats | null>(null)
const devices = ref<DeviceOption[]>([])
const loading = ref(false)
const detailVisible = ref(false)
const current = ref<WorkOrder | null>(null)
const createVisible = ref(false)
const creating = ref(false)
const createForm = reactive({
  device_id: '',
  title: '',
  description: '',
  priority: 'medium' as WorkOrderPriority,
})

const COLUMNS: { status: WorkOrderStatus; label: string; color: string }[] = [
  { status: 'pending', label: '待接单', color: WORKORDER_STATUS_COLOR.pending },
  { status: 'processing', label: '处理中', color: WORKORDER_STATUS_COLOR.processing },
  { status: 'accepting', label: '待验收', color: WORKORDER_STATUS_COLOR.accepting },
  { status: 'closed', label: '已关闭', color: WORKORDER_STATUS_COLOR.closed },
]

const grouped = computed(() => {
  const g: Record<WorkOrderStatus, WorkOrder[]> = { pending: [], processing: [], accepting: [], closed: [] }
  for (const o of orders.value) g[o.status].push(o)
  return g
})

function assigneeName(id: number | null): string {
  return id != null ? USER_NAME[id] ?? `工程师${id}` : '未指派'
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const res = await fetchWorkOrders({ page: 1, page_size: 100 })
    orders.value = res.items
    stats.value = await fetchWorkOrderStats()
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '工单加载失败')
  } finally {
    loading.value = false
  }
}

function openDetail(o: WorkOrder): void {
  current.value = o
  detailVisible.value = true
}

async function onChanged(updated: WorkOrder): Promise<void> {
  current.value = updated
  await load()
}

function openCreate(): void {
  createForm.device_id = devices.value[0]?.device_id ?? ''
  createForm.title = ''
  createForm.description = ''
  createForm.priority = 'medium'
  createVisible.value = true
}

async function submitCreate(): Promise<void> {
  if (!createForm.device_id || !createForm.title.trim()) {
    ElMessage.warning('请填写设备与标题')
    return
  }
  creating.value = true
  try {
    await createWorkOrder(
      {
        device_id: createForm.device_id,
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        priority: createForm.priority,
      },
      { id: user.user?.id ?? 0, role: user.role },
    )
    ElMessage.success('工单已创建')
    createVisible.value = false
    await load()
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '创建失败')
  } finally {
    creating.value = false
  }
}

function focusFromQuery(): void {
  const f = route.query.focus
  if (!f) return
  const o = orders.value.find((x) => x.id === Number(f))
  if (o) openDetail(o)
}
watch(() => route.query.focus, focusFromQuery)

onMounted(async () => {
  devices.value = await fetchDevices().catch(() => [])
  await load()
  focusFromQuery()
})
</script>

<template>
  <div class="wo">
    <header class="page-head gm-fade-up">
      <div>
        <p class="eyebrow">智能工单</p>
        <h1>工单看板</h1>
      </div>
      <div class="head-right">
        <div class="view-toggle">
          <button :class="{ active: viewMode === 'kanban' }" @click="viewMode = 'kanban'">
            <AppIcon name="dashboard" :size="16" /> 看板
          </button>
          <button :class="{ active: viewMode === 'table' }" @click="viewMode = 'table'">
            <AppIcon name="workorder" :size="16" /> 表格
          </button>
        </div>
        <el-button class="refresh-btn" :loading="loading" @click="load">
          <AppIcon v-if="!loading" name="refresh" :size="16" /><span style="margin-left: 6px">刷新</span>
        </el-button>
        <el-button v-if="canWrite" type="primary" class="create-btn" @click="openCreate">
          <AppIcon name="spark" :size="16" /><span style="margin-left: 6px">新建工单</span>
        </el-button>
      </div>
    </header>

    <!-- 统计条 -->
    <section v-if="stats" class="stats-bar gm-surface gm-fade-up">
      <div class="stat-cells">
        <div v-for="c in COLUMNS" :key="c.status" class="stat-cell">
          <span class="stat-dot" :style="{ background: c.color }"></span>
          <span class="stat-num gm-num">{{ stats.by_status[c.status] }}</span>
          <span class="stat-lbl">{{ c.label }}</span>
        </div>
      </div>
      <div class="load-box">
        <span class="load-title">工程师负载</span>
        <span v-for="e in stats.engineer_load" :key="e.user_id" class="load-chip">
          {{ e.real_name }}<b class="gm-num">{{ e.open_count }}</b>
        </span>
      </div>
    </section>

    <!-- 看板 -->
    <div v-if="viewMode === 'kanban'" v-loading="loading" class="kanban gm-fade-up">
      <div v-for="c in COLUMNS" :key="c.status" class="kcol">
        <div class="kcol-head" :style="{ '--kc': c.color }">
          <span class="kcol-dot"></span>
          <span class="kcol-title">{{ c.label }}</span>
          <span class="kcol-count gm-num">{{ grouped[c.status].length }}</span>
        </div>
        <div class="kcol-body">
          <button
            v-for="o in grouped[c.status]"
            :key="o.id"
            class="kcard"
            :style="{ '--pc': PRIORITY_COLOR[o.priority] }"
            @click="openDetail(o)"
          >
            <div class="kcard-top">
              <span class="prio">{{ PRIORITY_LABEL[o.priority] }}</span>
              <span class="kcard-id gm-num">#{{ o.id }}</span>
            </div>
            <h3 class="kcard-title">{{ o.title }}</h3>
            <div class="kcard-meta">
              <span><AppIcon name="device" :size="13" /> {{ o.device_id }}</span>
              <span><AppIcon name="user" :size="13" /> {{ assigneeName(o.assignee_id) }}</span>
            </div>
            <SlaCountdown :deadline="o.sla_deadline" :closed="o.status === 'closed'" />
          </button>
          <div v-if="grouped[c.status].length === 0" class="kcol-empty">暂无工单</div>
        </div>
      </div>
    </div>

    <!-- 表格 -->
    <PageTable
      v-else
      :data="orders"
      :total="orders.length"
      :page="1"
      :page-size="100"
      :loading="loading"
      class="gm-fade-up"
      @row-click="openDetail"
    >
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
      <el-table-column prop="device_id" label="设备" width="110" />
      <el-table-column label="优先级" width="90">
        <template #default="{ row }">
          <span class="prio" :style="{ '--pc': PRIORITY_COLOR[row.priority as WorkOrderPriority] }">{{ PRIORITY_LABEL[row.priority as WorkOrderPriority] }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <span class="wstatus" :style="{ '--sc': WORKORDER_STATUS_COLOR[row.status as WorkOrderStatus] }">{{ WORKORDER_STATUS_LABEL[row.status as WorkOrderStatus] }}</span>
        </template>
      </el-table-column>
      <el-table-column label="负责人" width="110">
        <template #default="{ row }">{{ assigneeName(row.assignee_id) }}</template>
      </el-table-column>
      <el-table-column label="SLA" width="150">
        <template #default="{ row }"><SlaCountdown :deadline="row.sla_deadline" :closed="row.status === 'closed'" /></template>
      </el-table-column>
      <el-table-column label="创建" width="170">
        <template #default="{ row }"><span class="gm-num">{{ formatDateTime(row.created_at) }}</span></template>
      </el-table-column>
    </PageTable>

    <!-- 新建弹窗 -->
    <el-dialog v-model="createVisible" title="新建工单" width="520px" :align-center="true" class="create-dialog">
      <el-form label-position="top">
        <el-form-item label="设备" required>
          <el-select v-model="createForm.device_id" placeholder="选择设备" style="width: 100%">
            <el-option v-for="d in devices" :key="d.device_id" :label="`${d.device_id} · ${d.name}`" :value="d.device_id" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="createForm.title" placeholder="如：CEMS-01 采样管路检查" maxlength="128" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="处置说明 / 背景" />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="createForm.priority" style="width: 100%">
            <el-option label="低（72h）" value="low" />
            <el-option label="中（24h）" value="medium" />
            <el-option label="高（8h）" value="high" />
            <el-option label="紧急（2h）" value="urgent" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <WorkOrderDetail
      :order="current"
      :visible="detailVisible"
      @update:visible="detailVisible = $event"
      @changed="onChanged"
    />
  </div>
</template>

<style scoped>
.wo {
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
  flex-wrap: wrap;
}
.view-toggle {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 11px;
  background: var(--gm-surface-3);
}
.view-toggle button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 9px;
  color: var(--gm-ink-soft);
  transition: all 0.15s ease;
}
.view-toggle button.active {
  background: var(--gm-surface);
  color: var(--gm-primary);
  box-shadow: var(--gm-shadow-sm);
}
.refresh-btn {
  border-radius: 11px;
  border-color: var(--gm-line);
  color: var(--gm-ink-soft);
}
.create-btn {
  border-radius: 11px;
}

/* 统计条 */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 22px;
  flex-wrap: wrap;
}
.stat-cells {
  display: flex;
  gap: 28px;
}
.stat-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.stat-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.stat-num {
  font-size: 22px;
  font-weight: 800;
  color: var(--gm-ink);
}
.stat-lbl {
  font-size: 12.5px;
  color: var(--gm-ink-faint);
}
.load-box {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.load-title {
  font-size: 12.5px;
  color: var(--gm-ink-faint);
}
.load-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--gm-ink-soft);
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--gm-surface-2);
  border: 1px solid var(--gm-line-soft);
}
.load-chip b {
  color: var(--gm-primary);
}

/* 看板 */
.kanban {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  align-items: start;
}
.kcol {
  background: var(--gm-surface-2);
  border: 1px solid var(--gm-line-soft);
  border-radius: var(--gm-radius);
  padding: 12px;
  min-height: 200px;
}
.kcol-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 12px;
}
.kcol-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--kc);
}
.kcol-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--gm-ink);
}
.kcol-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 700;
  color: var(--kc);
  background: color-mix(in srgb, var(--kc) 14%, transparent);
  padding: 1px 9px;
  border-radius: 999px;
}
.kcol-body {
  display: grid;
  gap: 10px;
}
.kcard {
  display: block;
  width: 100%;
  text-align: left;
  cursor: pointer;
  background: var(--gm-surface);
  border: 1px solid var(--gm-line-soft);
  border-left: 3px solid var(--pc);
  border-radius: 11px;
  padding: 12px 14px;
  box-shadow: var(--gm-shadow-sm);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  font-family: inherit;
}
.kcard:hover {
  transform: translateY(-2px);
  box-shadow: var(--gm-shadow-md);
}
.kcard-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.prio {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  color: var(--pc);
  background: color-mix(in srgb, var(--pc) 14%, transparent);
}
.kcard-id {
  font-size: 11.5px;
  color: var(--gm-ink-faint);
}
.kcard-title {
  margin: 0 0 10px;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--gm-ink);
  line-height: 1.4;
}
.kcard-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
.kcard-meta span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--gm-ink-soft);
}
.kcol-empty {
  text-align: center;
  font-size: 12.5px;
  color: var(--gm-ink-faint);
  padding: 24px 0;
}
.wstatus {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  color: var(--sc);
  background: color-mix(in srgb, var(--sc) 14%, transparent);
}
:deep(.el-table__row) {
  cursor: pointer;
}
@media (max-width: 1100px) {
  .kanban {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .kanban {
    grid-template-columns: 1fr;
  }
  .stat-cells {
    gap: 16px;
    flex-wrap: wrap;
  }
  .load-box {
    margin-left: 0;
  }
}
</style>
<template>
  <div class="wos">
    <div class="stats-bar">
      <div v-for="(label, st) in statusLabels" :key="st" class="stat" :class="st">
        <div class="num">{{ statusCount(st) }}</div>
        <div class="lbl">{{ label }}</div>
      </div>
      <div class="load">
        <span class="lbl">工程师负载：</span>
        <el-tag v-for="e in stats.engineer_load" :key="e.user_id" size="small" style="margin-right: 6px" :type="e.open_count > 2 ? 'danger' : 'success'">
          {{ e.real_name }} 未结 {{ e.open_count }}
        </el-tag>
      </div>
      <div class="spacer" />
      <el-radio-group v-model="view" size="small">
        <el-radio-button value="kanban">看板</el-radio-button>
        <el-radio-button value="table">表格</el-radio-button>
      </el-radio-group>
      <el-button v-if="userStore.canWrite" type="primary" size="small" @click="createVisible = true">新建工单</el-button>
      <el-button size="small" @click="loadAll">刷新</el-button>
    </div>

    <div v-if="view === 'kanban'" class="kanban">
      <div v-for="(label, st) in statusLabels" :key="st" class="col">
        <div class="col-title">{{ label }}（{{ byStatus(st).length }}）</div>
        <div class="cards">
          <div v-for="wo in byStatus(st)" :key="wo.id" class="card" :class="st" @click="openDetail(wo)">
            <div class="card-title">{{ wo.title }}</div>
            <div class="card-meta">{{ wo.device_id }} · {{ priorityName(wo.priority) }}</div>
            <div class="card-meta">负责人：{{ assigneeName(wo.assignee_id) }}</div>
            <div class="card-sla"><SlaCountdown v-if="st !== 'closed'" :deadline="wo.sla_deadline" /></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="table-wrap">
      <PageTable :data="page" :query="query" :loading="loading" @change="load">
        <el-table-column label="ID" prop="id" width="60" />
        <el-table-column label="标题" prop="title" min-width="180" show-overflow-tooltip />
        <el-table-column label="设备" prop="device_id" width="100" />
        <el-table-column label="优先级" width="80">
          <template #default="{ row }">{{ priorityName(row.priority) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">{{ woStatusName(row.status) }}</template>
        </el-table-column>
        <el-table-column label="负责人" width="90">
          <template #default="{ row }">{{ assigneeName(row.assignee_id) }}</template>
        </el-table-column>
        <el-table-column label="SLA 截止" width="180">
          <template #default="{ row }">{{ fmtTime(row.sla_deadline) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ fmtTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </PageTable>
    </div>

    <el-dialog v-model="detailVisible" :title="detail ? `工单 #${detail.id}` : ''" width="640px">
      <template v-if="detail">
        <div class="d-title">{{ detail.title }}</div>
        <el-descriptions :column="2" border size="small" class="d-desc">
          <el-descriptions-item label="设备">{{ detail.device_id }}</el-descriptions-item>
          <el-descriptions-item label="优先级">{{ priorityName(detail.priority) }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ woStatusName(detail.status) }}</el-descriptions-item>
          <el-descriptions-item label="负责人">{{ assigneeName(detail.assignee_id) }}</el-descriptions-item>
          <el-descriptions-item label="SLA 截止">{{ fmtTime(detail.sla_deadline) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ fmtTime(detail.created_at) }}</el-descriptions-item>
        </el-descriptions>
        <div class="d-sec">描述</div>
        <pre class="d-pre">{{ detail.description || '（无）' }}</pre>
        <div v-if="detail.finish_note" class="d-sec">完工说明</div>
        <pre v-if="detail.finish_note" class="d-pre">{{ detail.finish_note }}</pre>
        <div v-if="detail.accept_note" class="d-sec">验收意见</div>
        <pre v-if="detail.accept_note" class="d-pre">{{ detail.accept_note }}</pre>

        <div class="d-actions">
          <el-button
            v-if="detail.status === 'pending' && (userStore.isAdmin || userStore.user?.id === detail.assignee_id)"
            type="primary" @click="doAccept">接单
          </el-button>
          <el-button
            v-if="detail.status === 'processing' && userStore.user?.id === detail.assignee_id"
            type="success" @click="completeVisible = true">提交完工
          </el-button>
          <el-button
            v-if="detail.status === 'accepting' && userStore.isAdmin"
            type="success" @click="doApprove(true)">验收通过
          </el-button>
          <el-button
            v-if="detail.status === 'accepting' && userStore.isAdmin"
            type="danger" plain @click="doApprove(false)">驳回返工
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="completeVisible" title="提交完工" width="420px">
      <el-input v-model="finishNote" type="textarea" :rows="3" placeholder="完工说明（处理过程与结果）" />
      <template #footer>
        <el-button @click="completeVisible = false">取消</el-button>
        <el-button type="primary" @click="doComplete">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="createVisible" title="新建工单" width="480px">
      <el-form label-width="90px">
        <el-form-item label="设备">
          <el-select v-model="createForm.device_id" style="width: 100%">
            <el-option v-for="d in devices" :key="d.code" :value="d.code" :label="`${d.code} ${d.name}`" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题"><el-input v-model="createForm.title" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="createForm.description" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="createForm.priority" style="width: 100%">
            <el-option label="低" value="low" /><el-option label="中" value="medium" />
            <el-option label="高" value="high" /><el-option label="紧急" value="urgent" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="doCreate">创建（自动派单）</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageTable from '../../components/PageTable.vue'
import SlaCountdown from '../../components/SlaCountdown.vue'
import {
  acceptWorkorder, approveWorkorder, completeWorkorder, createWorkorder, listWorkorders, workorderStats,
} from '../../api/workorders'
import { listDevices } from '../../api/devices'
import { listUsers } from '../../api/users'
import { useUserStore } from '../../stores/user'
import type { Device, Page, User, WorkOrder, WorkOrderStats } from '../../types'
import { fmtTime, priorityName, woStatusName } from '../../utils/format'

const route = useRoute()
const userStore = useUserStore()

const statusLabels: Record<string, string> = { pending: '待接单', processing: '处理中', accepting: '待验收', closed: '已关闭' }
const view = ref<'kanban' | 'table'>('kanban')
const query = reactive({ page: 1, page_size: 50, status: '' as string })
const page = ref<Page<WorkOrder>>({ items: [], total: 0, page: 1, page_size: 50 })
const stats = ref<WorkOrderStats>({ by_status: { pending: 0, processing: 0, accepting: 0, closed: 0 }, engineer_load: [] })
const all = ref<WorkOrder[]>([])
const users = ref<User[]>([])
const devices = ref<Device[]>([])
const loading = ref(false)

const detailVisible = ref(false)
const detail = ref<WorkOrder | null>(null)
const completeVisible = ref(false)
const createVisible = ref(false)
const finishNote = ref('')
const createForm = reactive({ device_id: 'CEMS-01', title: '', description: '', priority: 'medium' })

const allOrders = computed(() => (view.value === 'kanban' ? all.value : page.value.items))

function statusCount(st: string | number | symbol): number {
  return (stats.value.by_status as Record<string, number>)[String(st)] ?? 0
}

function byStatus(st: string) {
  return allOrders.value.filter((w) => w.status === st)
}

function assigneeName(id: number): string {
  const u = users.value.find((x) => x.id === id)
  if (u) return u.real_name || u.username
  const e = stats.value.engineer_load.find((x) => x.user_id === id)
  return e?.real_name || `#${id}`
}

async function loadAll() {
  loading.value = true
  try {
    const [woPage, woAll, st] = await Promise.all([
      listWorkorders({ ...query, status: query.status || undefined }),
      listWorkorders({ page: 1, page_size: 100 }),
      workorderStats(),
    ])
    page.value = woPage
    all.value = woAll.items
    stats.value = st
  } finally {
    loading.value = false
  }
}

async function load(q = query) {
  page.value = await listWorkorders({ ...q, status: q.status || undefined })
}

function openDetail(wo: WorkOrder) {
  detail.value = wo
  detailVisible.value = true
}

async function doAccept() {
  if (!detail.value) return
  detail.value = await acceptWorkorder(detail.value.id)
  ElMessage.success('已接单')
  loadAll()
}

async function doComplete() {
  if (!detail.value) return
  detail.value = await completeWorkorder(detail.value.id, finishNote.value || undefined)
  completeVisible.value = false
  finishNote.value = ''
  ElMessage.success('已提交完工，待验收')
  loadAll()
}

async function doApprove(pass: boolean) {
  if (!detail.value) return
  detail.value = await approveWorkorder(detail.value.id, pass)
  ElMessage.success(pass ? '验收通过，工单已关闭' : '已驳回返工')
  loadAll()
}

async function doCreate() {
  if (!createForm.title) {
    ElMessage.warning('请填写标题')
    return
  }
  await createWorkorder({ ...createForm })
  createVisible.value = false
  createForm.title = ''
  createForm.description = ''
  ElMessage.success('工单已创建并自动派单')
  loadAll()
}

onMounted(async () => {
  loadAll()
  if (userStore.isAdmin) {
    listUsers({ page: 1, page_size: 100 }).then((p) => { users.value = p.items })
  }
  devices.value = (await listDevices({ page: 1, page_size: 100 })).items
  if (route.query.id) {
    const wo = all.value.find((w) => w.id === Number(route.query.id))
    if (wo) openDetail(wo)
  }
})
</script>

<style scoped>
.stats-bar { display: flex; gap: 14px; align-items: center; background: #fff; padding: 12px 14px; border-radius: 6px; margin-bottom: 12px; flex-wrap: wrap; }
.stat { text-align: center; min-width: 72px; }
.stat .num { font-size: 22px; font-weight: 700; }
.stat.pending .num { color: #e6a23c; }
.stat.processing .num { color: #409eff; }
.stat.accepting .num { color: #9254de; }
.stat.closed .num { color: #67c23a; }
.stat .lbl, .lbl { color: #909399; font-size: 12px; }
.load { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.spacer { flex: 1; }
.kanban { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.col { background: #fff; border-radius: 6px; padding: 10px; }
.col-title { font-weight: 600; font-size: 14px; margin-bottom: 10px; }
.cards { display: flex; flex-direction: column; gap: 8px; min-height: 120px; }
.card { border: 1px solid #ebeef5; border-left: 4px solid #909399; border-radius: 6px; padding: 10px; cursor: pointer; }
.card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.08); }
.card.pending { border-left-color: #e6a23c; }
.card.processing { border-left-color: #409eff; }
.card.accepting { border-left-color: #9254de; }
.card.closed { border-left-color: #67c23a; opacity: .75; }
.card-title { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.card-meta { color: #909399; font-size: 12px; margin-bottom: 4px; }
.card-sla { margin-top: 4px; }
.d-title { font-size: 16px; font-weight: 700; margin-bottom: 10px; }
.d-desc { margin-bottom: 12px; }
.d-sec { font-weight: 700; margin: 12px 0 6px; }
.d-pre { background: #f5f7fa; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-size: 13px; }
.d-actions { margin-top: 16px; display: flex; gap: 8px; }
</style>

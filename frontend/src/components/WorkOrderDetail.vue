<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import SlaCountdown from '@/components/SlaCountdown.vue'
import { useUserStore } from '@/stores/user'
import { usePermission } from '@/utils/permission'
import { acceptWorkOrder, completeWorkOrder, approveWorkOrder } from '@/api/workorder'
import { formatDateTime } from '@/utils/format'
import {
  PRIORITY_LABEL,
  PRIORITY_COLOR,
  WORKORDER_STATUS_LABEL,
  WORKORDER_STATUS_COLOR,
  USER_NAME,
  type WorkOrder,
} from '@/api/types'

const props = defineProps<{ order: WorkOrder | null; visible: boolean }>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'changed', order: WorkOrder): void
}>()

const user = useUserStore()
const { canWrite, isAdmin } = usePermission()
const note = ref('')
const loading = ref(false)

watch(
  () => props.visible,
  (v) => {
    if (v) note.value = ''
  },
)

const actor = computed(() => ({ id: user.user?.id ?? 0, role: user.role }))
const isAssignee = computed(() => props.order?.assignee_id === user.user?.id)
const canAccept = computed(
  () => props.order?.status === 'pending' && canWrite.value && (isAdmin.value || isAssignee.value),
)
const canComplete = computed(
  () => props.order?.status === 'processing' && canWrite.value && isAssignee.value,
)
const canApprove = computed(() => props.order?.status === 'accepting' && isAdmin.value)
const assigneeName = computed(() =>
  props.order?.assignee_id != null ? USER_NAME[props.order.assignee_id] ?? `工程师${props.order.assignee_id}` : '未指派',
)

async function run(fn: () => Promise<WorkOrder>): Promise<void> {
  loading.value = true
  try {
    const updated = await fn()
    ElMessage.success('操作成功')
    note.value = ''
    emit('changed', updated)
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } }; message?: string }
    ElMessage.error(err.response?.data?.detail || err.message || '操作失败')
  } finally {
    loading.value = false
  }
}

function accept(): void {
  if (props.order) void run(() => acceptWorkOrder(props.order!.id, actor.value))
}
function complete(): void {
  if (!note.value.trim()) {
    ElMessage.warning('请填写完成备注')
    return
  }
  if (props.order) void run(() => completeWorkOrder(props.order!.id, note.value.trim(), actor.value))
}
function approve(pass: boolean): void {
  if (!note.value.trim()) {
    ElMessage.warning('请填写审批备注')
    return
  }
  if (props.order) void run(() => approveWorkOrder(props.order!.id, pass, note.value.trim(), actor.value))
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    width="600px"
    :align-center="true"
    class="wo-dialog"
    @update:model-value="emit('update:visible', $event)"
  >
    <template #header>
      <div class="wo-head">
        <span>工单详情</span>
        <span v-if="order" class="wo-id gm-num">#{{ order.id }}</span>
      </div>
    </template>

    <div v-if="order" class="wo-body">
      <div class="wo-tags">
        <span class="prio" :style="{ '--pc': PRIORITY_COLOR[order.priority] }">{{ PRIORITY_LABEL[order.priority] }}</span>
        <span class="wstatus" :style="{ '--sc': WORKORDER_STATUS_COLOR[order.status] }">{{ WORKORDER_STATUS_LABEL[order.status] }}</span>
        <SlaCountdown :deadline="order.sla_deadline" :closed="order.status === 'closed'" />
      </div>

      <h3 class="wo-title">{{ order.title }}</h3>

      <div class="wo-meta">
        <div><span>设备</span><b>{{ order.device_id }}</b></div>
        <div><span>负责人</span><b>{{ assigneeName }}</b></div>
        <div><span>创建</span><b>{{ formatDateTime(order.created_at) }}</b></div>
        <div><span>SLA 截止</span><b>{{ formatDateTime(order.sla_deadline) }}</b></div>
        <div v-if="order.alarm_id != null"><span>关联告警</span><b>#{{ order.alarm_id }}</b></div>
        <div v-if="order.accepted_at"><span>接单</span><b>{{ formatDateTime(order.accepted_at) }}</b></div>
      </div>

      <div class="wo-desc">
        <span class="sec-label">描述</span>
        <p>{{ order.description }}</p>
      </div>

      <div v-if="order.finish_note" class="wo-note">
        <span class="sec-label">完成备注</span>
        <p>{{ order.finish_note }}</p>
      </div>
      <div v-if="order.accept_note" class="wo-note">
        <span class="sec-label">审批备注</span>
        <p>{{ order.accept_note }}</p>
      </div>

      <div v-if="canComplete || canApprove" class="wo-input">
        <span class="sec-label">{{ canApprove ? '审批备注' : '完成备注' }}（必填）</span>
        <el-input v-model="note" type="textarea" :rows="3" placeholder="请填写处置 / 审批说明" />
      </div>

      <div v-if="order.status === 'closed'" class="wo-closed">
        <AppIcon name="check" :size="16" /> 工单已关闭（终态，不可再操作）
      </div>
    </div>

    <template #footer>
      <div v-if="order" class="wo-footer">
        <el-button @click="emit('update:visible', false)">关闭</el-button>
        <el-button v-if="canAccept" type="primary" :loading="loading" @click="accept">
          <AppIcon name="check" :size="16" /><span style="margin-left: 6px">接单</span>
        </el-button>
        <el-button v-if="canComplete" type="primary" :loading="loading" @click="complete">
          <AppIcon name="check" :size="16" /><span style="margin-left: 6px">完成</span>
        </el-button>
        <template v-if="canApprove">
          <el-button type="danger" plain :loading="loading" @click="approve(false)">驳回</el-button>
          <el-button type="primary" :loading="loading" @click="approve(true)">
            <AppIcon name="check" :size="16" /><span style="margin-left: 6px">验收通过</span>
          </el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.wo-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 800;
  color: var(--gm-ink);
}
.wo-id {
  font-size: 13px;
  color: var(--gm-ink-faint);
  font-weight: 600;
}
.wo-body {
  display: grid;
  gap: 16px;
}
.wo-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.prio,
.wstatus {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 11px;
  border-radius: 999px;
  color: var(--pc, var(--sc));
  background: color-mix(in srgb, var(--pc, var(--sc)) 14%, transparent);
}
.wo-title {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  color: var(--gm-ink);
  line-height: 1.4;
}
.wo-meta {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 18px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--gm-surface-2);
  border: 1px solid var(--gm-line-soft);
}
.wo-meta div {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.wo-meta span {
  font-size: 11.5px;
  color: var(--gm-ink-faint);
}
.wo-meta b {
  font-size: 13.5px;
  color: var(--gm-ink);
  font-weight: 600;
}
.sec-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--gm-primary);
  margin-bottom: 7px;
}
.wo-desc p,
.wo-note p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--gm-ink-soft);
}
.wo-note p {
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--gm-surface-2);
}
.wo-closed {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--gm-green);
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(22, 163, 74, 0.1);
}
.wo-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
@media (max-width: 640px) {
  :deep(.el-dialog) {
    width: calc(100vw - 24px) !important;
  }
  .wo-meta {
    grid-template-columns: 1fr;
  }
}
</style>
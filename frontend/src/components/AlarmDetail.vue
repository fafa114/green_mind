<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import LevelTag from '@/components/LevelTag.vue'
import { usePermission } from '@/utils/permission'
import { formatDateTime, formatNumber, formatPercent } from '@/utils/format'
import {
  ALARM_STATUS_LABEL,
  POLLUTANT_LABEL,
  type Alarm,
} from '@/api/types'

const props = defineProps<{ alarm: Alarm | null; visible: boolean }>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'ack', id: number): void
  (e: 'view-workorder', id: number): void
}>()

const { canWrite } = usePermission()
const exceed = computed(
  () => props.alarm != null && props.alarm.value >= props.alarm.limit_val,
)
const canAck = computed(
  () => canWrite.value && props.alarm?.status === 'pending',
)
</script>

<template>
  <el-drawer
    :model-value="visible"
    direction="rtl"
    size="460px"
    :with-header="true"
    class="alarm-drawer"
    @update:model-value="emit('update:visible', $event)"
  >
    <template #header>
      <div class="ad-head">
        <span>告警详情</span>
        <span v-if="alarm" class="ad-id gm-num">#{{ alarm.id }}</span>
      </div>
    </template>

    <div v-if="alarm" class="ad-body">
      <div class="ad-tags">
        <LevelTag :level="alarm.level" />
        <span class="status-tag" :class="alarm.status">{{ ALARM_STATUS_LABEL[alarm.status] }}</span>
      </div>

      <h3 class="ad-title">{{ alarm.device_id }} · {{ POLLUTANT_LABEL[alarm.pollutant] }}</h3>
      <p class="ad-time"><AppIcon name="gauge" :size="14" /> {{ formatDateTime(alarm.ts) }}</p>

      <div class="ad-values" :class="{ exceed }">
        <div class="v-box">
          <span class="v-lbl">当前值</span>
          <span class="v-num gm-num">{{ formatNumber(alarm.value) }}</span>
          <span class="v-unit">mg/m³</span>
        </div>
        <AppIcon name="chevronRight" :size="20" />
        <div class="v-box">
          <span class="v-lbl">标准值</span>
          <span class="v-num gm-num">{{ formatNumber(alarm.limit_val) }}</span>
          <span class="v-unit">mg/m³</span>
        </div>
        <span v-if="exceed" class="v-flag">超标</span>
      </div>

      <div class="ad-reason">
        <span class="sec-label">触发原因</span>
        <p>{{ alarm.reason }}</p>
      </div>

      <div class="ad-diag">
        <span class="sec-label"><AppIcon name="spark" :size="15" /> AI 诊断</span>

        <div v-if="!alarm.diagnosis" class="diag-loading">
          <span class="spinner"></span>
          诊断生成中，稍后自动回填…
        </div>

        <template v-else>
          <div class="diag-summary">{{ alarm.diagnosis.summary }}</div>

          <div class="diag-block">
            <span class="block-label">候选根因</span>
            <div v-for="(rc, i) in alarm.diagnosis.root_causes" :key="i" class="cause">
              <div class="cause-top">
                <span>{{ rc.cause }}</span>
                <b class="gm-num">{{ formatPercent(rc.confidence) }}</b>
              </div>
              <el-progress
                :percentage="Math.round(rc.confidence * 100)"
                :stroke-width="7"
                :show-text="false"
                color="#0f766e"
              />
            </div>
          </div>

          <div class="diag-block">
            <span class="block-label">处置措施</span>
            <ul class="measures">
              <li v-for="(m, i) in alarm.diagnosis.measures" :key="i">
                <AppIcon name="check" :size="14" :stroke-width="2.4" />{{ m }}
              </li>
            </ul>
          </div>

          <div class="diag-recovery">
            <AppIcon name="gauge" :size="15" />
            预计恢复：<b>{{ alarm.diagnosis.estimated_recovery_minutes }} 分钟</b>
          </div>
        </template>
      </div>
    </div>

    <template #footer>
      <div v-if="alarm" class="ad-footer">
        <el-button
          v-if="alarm.workorder_id != null"
          plain
          @click="emit('view-workorder', alarm.workorder_id)"
        >
          <AppIcon name="workorder" :size="16" />
          <span style="margin-left: 6px">查看工单 #{{ alarm.workorder_id }}</span>
        </el-button>
        <el-button v-if="canAck" type="primary" @click="emit('ack', alarm.id)">
          <AppIcon name="check" :size="16" />
          <span style="margin-left: 6px">确认告警</span>
        </el-button>
        <span v-if="alarm.status !== 'pending'" class="ack-done">
          <AppIcon name="check" :size="15" /> {{ ALARM_STATUS_LABEL[alarm.status] }}
        </span>
      </div>
    </template>
  </el-drawer>
</template>

<style scoped>
.ad-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 800;
  color: var(--gm-ink);
}
.ad-id {
  font-size: 13px;
  color: var(--gm-ink-faint);
  font-weight: 600;
}
.ad-body {
  display: grid;
  gap: 18px;
}
.ad-tags {
  display: flex;
  gap: 8px;
  align-items: center;
}
.status-tag {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 11px;
  border-radius: 999px;
}
.status-tag.pending { color: var(--gm-amber); background: rgba(245, 158, 11, 0.14); }
.status-tag.acked { color: var(--gm-blue); background: rgba(14, 165, 233, 0.12); }
.status-tag.closed { color: var(--gm-green); background: rgba(22, 163, 74, 0.12); }
.ad-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--gm-ink);
}
.ad-time {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -8px 0 0;
  font-size: 13px;
  color: var(--gm-ink-faint);
}
.ad-values {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  border-radius: 13px;
  background: var(--gm-surface-2);
  border: 1px solid var(--gm-line-soft);
  color: var(--gm-ink-faint);
}
.ad-values.exceed {
  background: rgba(239, 68, 68, 0.06);
  border-color: rgba(239, 68, 68, 0.3);
}
.v-box {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.v-lbl {
  font-size: 11.5px;
  color: var(--gm-ink-faint);
}
.v-num {
  font-size: 26px;
  font-weight: 800;
  color: var(--gm-ink);
}
.ad-values.exceed .v-box:first-child .v-num {
  color: var(--gm-red-deep);
}
.v-unit {
  font-size: 11px;
  color: var(--gm-ink-faint);
}
.v-flag {
  position: absolute;
  right: 14px;
  top: 14px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--gm-red);
  background: rgba(239, 68, 68, 0.12);
  padding: 2px 9px;
  border-radius: 999px;
}
.sec-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--gm-primary);
  margin-bottom: 8px;
}
.ad-reason p {
  margin: 0;
  font-size: 13.5px;
  color: var(--gm-ink-soft);
  line-height: 1.6;
}
.ad-diag {
  padding: 16px 18px;
  border-radius: 13px;
  background: linear-gradient(180deg, var(--gm-primary-soft), var(--gm-surface-2));
  border: 1px solid rgba(15, 118, 110, 0.12);
}
.diag-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--gm-ink-soft);
  padding: 8px 0;
}
.spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--gm-primary-soft);
  border-top-color: var(--gm-primary);
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.diag-summary {
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--gm-ink);
  margin-bottom: 16px;
}
.diag-block {
  margin-bottom: 14px;
}
.block-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--gm-ink-soft);
  margin-bottom: 8px;
}
.cause {
  margin-bottom: 10px;
}
.cause-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: var(--gm-ink);
  margin-bottom: 5px;
}
.cause-top b {
  color: var(--gm-primary);
}
.measures {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 7px;
}
.measures li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: var(--gm-ink-soft);
}
.measures li .gm-icon {
  color: var(--gm-green);
  flex: none;
  margin-top: 2px;
}
.diag-recovery {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: var(--gm-ink-soft);
  padding-top: 12px;
  border-top: 1px dashed rgba(15, 118, 110, 0.2);
}
.diag-recovery b {
  color: var(--gm-primary);
}
.ad-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
}
.ack-done {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--gm-green);
}
:deep(.el-drawer__body) {
  padding-top: 8px;
}
@media (max-width: 640px) {
  :deep(.el-drawer) {
    width: 100% !important;
  }
}
</style>
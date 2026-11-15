<template>
  <div>
    <div class="filters">
      <el-select v-model="query.level" clearable placeholder="告警级别" style="width: 130px" @change="search">
        <el-option label="红色" value="red" /><el-option label="橙色" value="orange" /><el-option label="黄色" value="yellow" />
      </el-select>
      <el-select v-model="query.status" clearable placeholder="状态" style="width: 130px" @change="search">
        <el-option label="待确认" value="pending" /><el-option label="已确认" value="acked" /><el-option label="已关闭" value="closed" />
      </el-select>
      <el-select v-model="query.device_id" clearable placeholder="设备" style="width: 160px" @change="search">
        <el-option label="CEMS-01" value="CEMS-01" /><el-option label="CEMS-02" value="CEMS-02" />
      </el-select>
      <el-button type="primary" plain @click="search">查询</el-button>
    </div>

    <PageTable :data="page" :query="query" :loading="loading" @change="load">
      <el-table-column label="级别" width="80">
        <template #default="{ row }"><LevelTag :level="row.level" /></template>
      </el-table-column>
      <el-table-column label="时间" prop="ts" width="170">
        <template #default="{ row }">{{ fmtTime(row.ts) }}</template>
      </el-table-column>
      <el-table-column label="设备" prop="device_id" width="110" />
      <el-table-column label="污染物" width="100">
        <template #default="{ row }">{{ pollutantName(row.pollutant) }}</template>
      </el-table-column>
      <el-table-column label="浓度">
        <template #default="{ row }">{{ row.value }} / 标准 {{ row.limit_val }} mg/m³</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">{{ alarmStatusName(row.status) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
          <el-button v-if="row.status === 'pending'" link type="warning" @click="ack(row)">确认</el-button>
        </template>
      </el-table-column>
    </PageTable>

    <el-drawer v-model="detailVisible" title="告警诊断详情" size="480px">
      <template v-if="detail">
        <div class="d-head">
          <LevelTag :level="detail.level" />
          <span>{{ detail.device_id }} · {{ pollutantName(detail.pollutant) }} = {{ detail.value }}（标准 {{ detail.limit_val }}）</span>
        </div>
        <div class="d-time">{{ fmtTime(detail.ts) }}</div>
        <el-divider>AI 诊断</el-divider>
        <template v-if="detail.diagnosis">
          <div v-for="(rc, i) in detail.diagnosis.root_causes || []" :key="i" class="cause">
            <div class="cause-name">{{ i + 1 }}. {{ rc.cause }}</div>
            <el-progress :percentage="Math.round(rc.confidence * 100)" :stroke-width="10" />
          </div>
          <div class="d-sec">处置措施</div>
          <ul class="measures">
            <li v-for="(m, i) in detail.diagnosis.measures || []" :key="i">{{ m }}</li>
          </ul>
          <div class="d-sec">摘要</div>
          <p>{{ detail.diagnosis.summary }}</p>
          <div class="d-sec">预计恢复</div>
          <p>约 {{ detail.diagnosis.estimated_recovery_minutes }} 分钟</p>
        </template>
        <el-empty v-else description="AI 诊断生成中…" :image-size="60" />
        <el-divider />
        <el-button v-if="detail.workorder_id" type="primary" plain @click="goWorkorder(detail.workorder_id)">
          查看工单 #{{ detail.workorder_id }}
        </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageTable from '../../components/PageTable.vue'
import LevelTag from '../../components/LevelTag.vue'
import { ackAlarm, getAlarm, listAlarms } from '../../api/alarms'
import type { Alarm, Page } from '../../types'
import { alarmStatusName, fmtTime, pollutantName } from '../../utils/format'

const router = useRouter()
const query = reactive<{ level?: string; status?: string; device_id?: string; page: number; page_size: number }>({ page: 1, page_size: 20 })
const page = ref<Page<Alarm>>({ items: [], total: 0, page: 1, page_size: 20 })
const loading = ref(false)
const detailVisible = ref(false)
const detail = ref<Alarm | null>(null)

async function load(q = query) {
  loading.value = true
  try {
    page.value = await listAlarms(q as any)
  } finally {
    loading.value = false
  }
}

function search() {
  query.page = 1
  load()
}

async function openDetail(row: Alarm) {
  detail.value = await getAlarm(row.id)
  detailVisible.value = true
}

async function ack(row: Alarm) {
  await ackAlarm(row.id)
  ElMessage.success('已确认')
  load()
}

function goWorkorder(id: number) {
  router.push({ path: '/workorders', query: { id: String(id) } })
}

onMounted(() => load())
</script>

<style scoped>
.filters { display: flex; gap: 10px; margin-bottom: 12px; background: #fff; padding: 12px; border-radius: 6px; }
.d-head { display: flex; gap: 10px; align-items: center; font-weight: 600; }
.d-time { color: #909399; font-size: 13px; margin-top: 8px; }
.cause { margin-bottom: 12px; }
.cause-name { margin-bottom: 4px; font-size: 14px; }
.d-sec { font-weight: 700; margin: 14px 0 6px; }
.measures { padding-left: 20px; }
</style>

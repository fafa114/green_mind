<template>
  <div class="reports">
    <div class="layout">
      <div class="list">
        <div class="list-head">
          <span>月报列表</span>
          <el-button v-if="userStore.isAdmin" type="primary" size="small" @click="genVisible = true">生成月报</el-button>
        </div>
        <div
          v-for="r in reports"
          :key="r.id"
          class="r-item"
          :class="{ active: current?.id === r.id }"
          @click="select(r)"
        >
          <div class="r-period">{{ r.period }}</div>
          <div class="r-time">{{ fmtTime(r.generated_at) }}</div>
        </div>
        <el-empty v-if="!reports.length" description="暂无报表" :image-size="60" />
      </div>

      <div class="preview" v-loading="detailLoading">
        <template v-if="current">
          <div class="p-head">
            <div class="p-title">GreenMind 月报 · {{ current.period }}</div>
            <div class="p-actions">
              <el-button size="small" type="primary" plain @click="exportFile('pdf')">导出 PDF</el-button>
              <el-button size="small" type="success" plain @click="exportFile('excel')">导出 Excel</el-button>
            </div>
          </div>
          <div v-if="current.stats" class="p-stats">
            <el-descriptions :column="3" border size="small">
              <el-descriptions-item v-for="(s, k) in current.stats.pollutants || {}" :key="k" :label="pollutantName(String(k))">
                最大 {{ s.max ?? '--' }} / 均值 {{ s.avg ?? '--' }} / 超标 {{ s.exceed_hours ?? s.exceed_count ?? 0 }}h
              </el-descriptions-item>
              <el-descriptions-item label="告警">
                黄 {{ current.stats.alarm_by_level?.yellow ?? 0 }} · 橙 {{ current.stats.alarm_by_level?.orange ?? 0 }} · 红 {{ current.stats.alarm_by_level?.red ?? 0 }}
              </el-descriptions-item>
              <el-descriptions-item label="工单">
                共 {{ current.stats.workorder?.total ?? 0 }} / 完结 {{ current.stats.workorder?.completed ?? 0 }} / 按时率 {{ current.stats.workorder?.on_time_rate ?? '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="巡检次数">{{ current.stats.inspection_count ?? 0 }}</el-descriptions-item>
              <el-descriptions-item label="平均健康分">{{ current.stats.avg_health ?? '--' }}</el-descriptions-item>
            </el-descriptions>
          </div>
          <div class="p-md"><MarkdownView :content="current.content_md" /></div>
        </template>
        <el-empty v-else description="选择一份月报查看" />
      </div>
    </div>

    <el-dialog v-model="genVisible" title="生成月报" width="380px">
      <el-date-picker v-model="genPeriod" type="month" value-format="YYYY-MM" placeholder="选择月份" style="width: 100%" />
      <div class="gen-tip">生成需调用 LLM，可能耗时约 30 秒，请耐心等待。</div>
      <template #footer>
        <el-button @click="genVisible = false">取消</el-button>
        <el-button type="primary" :loading="generating" @click="generate">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import MarkdownView from '../../components/MarkdownView.vue'
import { generateReport, getReport, listReports, reportExportUrl } from '../../api/reports'
import { useUserStore } from '../../stores/user'
import type { Report, ReportListItem } from '../../types'
import { fmtTime, pollutantName } from '../../utils/format'

const userStore = useUserStore()
const reports = ref<ReportListItem[]>([])
const current = ref<Report | null>(null)
const detailLoading = ref(false)
const genVisible = ref(false)
const genPeriod = ref('')
const generating = ref(false)

async function loadList() {
  const res = await listReports({ page: 1, page_size: 50 })
  reports.value = res.items
  if (res.items.length && !current.value) {
    await select(res.items[0])
  }
}

async function select(r: ReportListItem) {
  detailLoading.value = true
  try {
    current.value = await getReport(r.id)
  } finally {
    detailLoading.value = false
  }
}

async function generate() {
  if (!genPeriod.value) {
    ElMessage.warning('请选择月份')
    return
  }
  generating.value = true
  try {
    current.value = await generateReport(genPeriod.value)
    genVisible.value = false
    ElMessage.success('月报已生成')
    loadList()
  } finally {
    generating.value = false
  }
}

function exportFile(format: 'pdf' | 'excel') {
  if (!current.value) return
  window.open(reportExportUrl(current.value.id, format), '_blank')
}

onMounted(loadList)
</script>

<style scoped>
.reports { background: #fff; border-radius: 6px; padding: 14px; }
.layout { display: flex; gap: 14px; height: calc(100vh - 170px); }
.list { width: 220px; border-right: 1px solid #ebeef5; overflow-y: auto; }
.list-head { display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-bottom: 10px; }
.r-item { padding: 10px; border-radius: 6px; cursor: pointer; margin-bottom: 6px; }
.r-item:hover { background: #f5f7fa; }
.r-item.active { background: #ecf5ff; }
.r-period { font-weight: 600; }
.r-time { color: #909399; font-size: 12px; margin-top: 2px; }
.preview { flex: 1; overflow-y: auto; padding-left: 6px; }
.p-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.p-title { font-size: 16px; font-weight: 700; }
.p-stats { margin-bottom: 14px; }
.p-md { border-top: 1px solid #ebeef5; padding-top: 12px; }
.gen-tip { color: #909399; font-size: 12px; margin-top: 10px; }
</style>

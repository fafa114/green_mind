<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import { fetchReports, fetchReport, generateReport, exportReport } from '@/api/report'
import { useUserStore } from '@/stores/user'
import { usePermission } from '@/utils/permission'
import { type Report, type ReportListItem } from '@/api/types'
import { formatDateTime, formatPercent } from '@/utils/format'

const user = useUserStore()
const { isAdmin } = usePermission()
const actor = computed(() => ({ id: user.user?.id ?? 0, role: user.role }))

const list = ref<ReportListItem[]>([])
const current = ref<Report | null>(null)
const loading = ref(false)
const previewLoading = ref(false)
const exporting = ref<'pdf' | 'excel' | null>(null)
const genVisible = ref(false)
const generating = ref(false)
const genPeriod = ref('')

async function loadList(selectFirst = true): Promise<void> {
  loading.value = true
  try {
    const res = await fetchReports(1, 50)
    list.value = res.items
    if (selectFirst && res.items.length) await selectReport(res.items[0].id)
  } finally {
    loading.value = false
  }
}

async function selectReport(id: number): Promise<void> {
  previewLoading.value = true
  try {
    current.value = await fetchReport(id)
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '报表加载失败')
  } finally {
    previewLoading.value = false
  }
}

async function doExport(format: 'pdf' | 'excel'): Promise<void> {
  if (!current.value) return
  exporting.value = format
  try {
    await exportReport(current.value, format)
    if (format === 'excel') ElMessage.success('Excel 已下载')
    else ElMessage.success('已打开打印预览，可另存为 PDF')
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '导出失败')
  } finally {
    exporting.value = null
  }
}

function openGenerate(): void {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  genPeriod.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  genVisible.value = true
}

async function generate(): Promise<void> {
  if (!genPeriod.value) { ElMessage.warning('请选择月份'); return }
  generating.value = true
  try {
    const r = await generateReport(genPeriod.value, actor.value)
    ElMessage.success('报表已生成')
    genVisible.value = false
    await loadList(false)
    await selectReport(r.id)
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '生成失败')
  } finally {
    generating.value = false
  }
}

onMounted(() => void loadList())
</script>

<template>
  <div class="reports">
    <header class="page-head gm-fade-up">
      <div>
        <p class="eyebrow">台账报表</p>
        <h1>月度排放报告</h1>
      </div>
      <el-button v-if="isAdmin" type="primary" size="large" @click="openGenerate">
        <AppIcon name="spark" :size="16" /><span style="margin-left: 6px">生成报表</span>
      </el-button>
    </header>

    <div class="report-grid">
      <aside class="list-panel gm-surface gm-fade-up">
        <div class="list-head">报表列表</div>
        <div v-loading="loading" class="list-body">
          <button
            v-for="r in list"
            :key="r.id"
            class="report-item"
            :class="{ active: current?.id === r.id }"
            @click="selectReport(r.id)"
          >
            <AppIcon name="report" :size="18" />
            <div class="ri-text"><strong>{{ r.period }}</strong><small>{{ formatDateTime(r.generated_at) }}</small></div>
          </button>
          <el-empty v-if="!loading && list.length === 0" description="暂无报表" :image-size="60" />
        </div>
      </aside>

      <section class="preview-panel gm-surface gm-fade-up">
        <div v-if="current" class="preview-toolbar">
          <div class="pt-title">
            <strong>{{ current.period }} 报告</strong>
            <small>生成于 {{ formatDateTime(current.generated_at) }}</small>
          </div>
          <div class="pt-actions">
            <el-button :loading="exporting === 'pdf'" @click="doExport('pdf')">
              <AppIcon v-if="exporting !== 'pdf'" name="report" :size="15" /><span style="margin-left: 5px">PDF</span>
            </el-button>
            <el-button :loading="exporting === 'excel'" @click="doExport('excel')">
              <AppIcon v-if="exporting !== 'excel'" name="report" :size="15" /><span style="margin-left: 5px">Excel</span>
            </el-button>
          </div>
        </div>

        <div v-if="current" class="stats-strip">
          <div class="stat"><span class="stat-num gm-num">{{ current.stats.alarm_by_level.yellow + current.stats.alarm_by_level.orange + current.stats.alarm_by_level.red }}</span><span class="stat-lbl">告警总数</span></div>
          <div class="stat"><span class="stat-num gm-num">{{ current.stats.workorder.completed }}/{{ current.stats.workorder.total }}</span><span class="stat-lbl">工单完成</span></div>
          <div class="stat"><span class="stat-num gm-num">{{ formatPercent(current.stats.workorder.on_time_rate) }}</span><span class="stat-lbl">按时率</span></div>
          <div class="stat"><span class="stat-num gm-num">{{ current.stats.avg_health }}</span><span class="stat-lbl">平均健康</span></div>
        </div>

        <div v-loading="previewLoading" class="preview-body">
          <MarkdownView v-if="current" :source="current.content_md" />
          <el-empty v-else description="选择左侧报表查看预览" />
        </div>
      </section>
    </div>

    <el-dialog v-model="genVisible" title="生成月度报表" width="420px" :align-center="true">
      <el-form label-position="top">
        <el-form-item label="报告月份">
          <el-date-picker v-model="genPeriod" type="month" value-format="YYYY-MM" placeholder="选择月份" style="width: 100%" />
        </el-form-item>
      </el-form>
      <p class="gen-note">生成将汇总该月统计并撰写四章节报告，可能耗时数十秒。</p>
      <template #footer>
        <el-button @click="genVisible = false">取消</el-button>
        <el-button type="primary" :loading="generating" @click="generate">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.reports { display: grid; gap: 18px; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.eyebrow { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gm-primary); font-weight: 700; margin: 0 0 6px; }
.page-head h1 { margin: 0; font-size: 27px; font-weight: 800; color: var(--gm-ink); }
.report-grid { display: grid; grid-template-columns: 280px 1fr; gap: 18px; align-items: start; }
.list-panel { overflow: hidden; }
.list-head { padding: 15px 18px; font-size: 14px; font-weight: 700; color: var(--gm-ink); border-bottom: 1px solid var(--gm-line-soft); }
.list-body { padding: 10px; display: grid; gap: 6px; max-height: 600px; overflow-y: auto; }
.report-item { display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; cursor: pointer; border: none; background: none; padding: 12px 13px; border-radius: 11px; color: var(--gm-ink-faint); font-family: inherit; transition: background 0.15s ease; }
.report-item:hover { background: var(--gm-surface-2); }
.report-item.active { background: var(--gm-primary-soft); color: var(--gm-primary); }
.ri-text { display: flex; flex-direction: column; line-height: 1.3; }
.ri-text strong { font-size: 14px; color: var(--gm-ink); }
.report-item.active .ri-text strong { color: var(--gm-primary-strong); }
.ri-text small { font-size: 11px; color: var(--gm-ink-faint); }
.preview-panel { padding: 20px 24px; min-width: 0; }
.preview-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.pt-title strong { display: block; font-size: 17px; color: var(--gm-ink); }
.pt-title small { font-size: 12px; color: var(--gm-ink-faint); }
.pt-actions { display: flex; gap: 8px; }
.stats-strip { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 20px; }
.stat { flex: 1; min-width: 110px; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 14px; border-radius: 12px; background: var(--gm-surface-2); border: 1px solid var(--gm-line-soft); }
.stat-num { font-size: 22px; font-weight: 800; color: var(--gm-primary); }
.stat-lbl { font-size: 12px; color: var(--gm-ink-faint); }
.preview-body { min-height: 300px; }
.gen-note { margin: 0; font-size: 12.5px; color: var(--gm-ink-faint); }
@media (max-width: 900px) { .report-grid { grid-template-columns: 1fr; } .list-body { max-height: 240px; } }
</style>
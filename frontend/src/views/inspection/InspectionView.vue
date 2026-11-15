<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Html5Qrcode } from 'html5-qrcode'
import AppIcon from '@/components/AppIcon.vue'
import SignaturePad from '@/components/SignaturePad.vue'
import { fetchDevices } from '@/api/data'
import { uploadFile, submitInspection, fetchInspections, fetchInspection } from '@/api/inspection'
import { useUserStore } from '@/stores/user'
import { INSPECTION_ITEMS, USER_NAME, type DeviceOption, type Inspection, type ChecklistItem } from '@/api/types'
import { formatDateTime } from '@/utils/format'

const user = useUserStore()
const actor = computed(() => ({ id: user.user?.id ?? 0, role: user.role }))

const tab = ref<'submit' | 'history'>('submit')
const devices = ref<DeviceOption[]>([])
const deviceCode = ref('')
const checklist = reactive<ChecklistItem[]>(INSPECTION_ITEMS.map((item) => ({ item, ok: true, note: '' })))
const photos = ref<string[]>([])
const fileList = ref<{ name: string; url: string }[]>([])
const signature = ref<string | null>(null)
const sigPad = ref<InstanceType<typeof SignaturePad> | null>(null)
const submitting = ref(false)
const submitted = ref(false)
const result = ref<{ id: number; workorder_id: number | null } | null>(null)
const scanning = ref(false)
let scanner: Html5Qrcode | null = null

const selectedDevice = computed(() => devices.value.find((d) => d.device_id === deviceCode.value))
const abnormalDesc = ref('')
const hasAbnormal = computed(() => checklist.some((c) => !c.ok))
watch(
  checklist,
  () => {
    abnormalDesc.value = checklist.filter((c) => !c.ok).map((c) => `${c.item}异常${c.note ? '：' + c.note : ''}`).join('；')
  },
  { deep: true },
)

const historyRows = ref<Inspection[]>([])
const historyLoading = ref(false)
const detailVisible = ref(false)
const detail = ref<Inspection | null>(null)

async function startScan(): Promise<void> {
  try {
    scanning.value = true
    await new Promise((r) => setTimeout(r, 50))
    scanner = new Html5Qrcode('qr-reader')
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 220 },
      (text) => onDecoded(text),
      () => {},
    )
  } catch {
    scanning.value = false
    ElMessage.warning('相机不可用，请手动选择设备')
  }
}
function onDecoded(text: string): void {
  stopScan()
  const dev = devices.value.find((d) => d.device_id === text || d.name === text)
  if (dev) {
    deviceCode.value = dev.device_id
    ElMessage.success(`已识别：${dev.name}`)
  } else {
    ElMessage.warning(`二维码非设备码：${text}`)
  }
}
function stopScan(): void {
  scanning.value = false
  if (scanner) {
    scanner.stop().then(() => { scanner?.clear(); scanner = null }).catch(() => { scanner = null })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function customUpload(options: any): Promise<void> {
  const file = options.file as File
  if (file.size > 5 * 1024 * 1024) { ElMessage.error('图片需 ≤5MB'); return }
  if (!/image\/(jpeg|png)/.test(file.type)) { ElMessage.error('仅支持 jpg/png'); return }
  try {
    const { path } = await uploadFile(file)
    photos.value.push(path)
    fileList.value.push({ name: file.name, url: path })
  } catch {
    ElMessage.error('上传失败')
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onRemove(file: any): void {
  photos.value = photos.value.filter((p) => p !== file.url)
  fileList.value = fileList.value.filter((f) => f.url !== file.url)
}

async function submit(): Promise<void> {
  if (!deviceCode.value) { ElMessage.warning('请先扫码或选择设备'); return }
  if (!signature.value) { ElMessage.warning('请完成手写签名'); return }
  submitting.value = true
  try {
    const res = await submitInspection(
      { device_code: deviceCode.value, checklist: checklist.map((c) => ({ ...c })), photos: photos.value, signature_path: signature.value, abnormal_desc: abnormalDesc.value || null },
      actor.value,
    )
    result.value = res
    submitted.value = true
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '提交失败')
  } finally {
    submitting.value = false
  }
}

function reset(): void {
  checklist.forEach((c) => { c.ok = true; c.note = '' })
  photos.value = []
  fileList.value = []
  signature.value = null
  sigPad.value?.clear()
  submitted.value = false
  result.value = null
}

async function loadHistory(): Promise<void> {
  historyLoading.value = true
  try {
    const res = await fetchInspections(undefined, 1, 50)
    historyRows.value = res.items
  } finally {
    historyLoading.value = false
  }
}
async function openDetail(row: Inspection): Promise<void> {
  detail.value = row
  detailVisible.value = true
  try { detail.value = await fetchInspection(row.id) } catch { /* 保留行 */ }
}
function switchTab(t: 'submit' | 'history'): void {
  tab.value = t
  if (t === 'history') void loadHistory()
}

onMounted(async () => {
  devices.value = await fetchDevices().catch(() => [])
})
onBeforeUnmount(stopScan)
</script>

<template>
  <div class="insp">
    <header class="insp-head">
      <div class="insp-brand">
        <span class="insp-logo"><AppIcon name="inspection" :size="22" /></span>
        <div><strong>智能巡检</strong><small>{{ user.realName }} · 移动端</small></div>
      </div>
      <div class="insp-tabs">
        <button :class="{ active: tab === 'submit' }" @click="switchTab('submit')">巡检</button>
        <button :class="{ active: tab === 'history' }" @click="switchTab('history')">历史</button>
      </div>
    </header>

    <!-- 提交成功页 -->
    <div v-if="submitted && result && tab === 'submit'" class="success gm-fade-up">
      <span class="success-ico"><AppIcon name="check" :size="40" :stroke-width="2.4" /></span>
      <h2>巡检提交成功</h2>
      <p class="success-dev">{{ selectedDevice?.name }} · 记录 #{{ result.id }}</p>
      <div v-if="result.workorder_id != null" class="success-wo">
        <AppIcon name="workorder" :size="18" />
        发现异常，已自动生成工单 <b>#{{ result.workorder_id }}</b>
      </div>
      <p v-else class="success-ok">全部检查项正常，无需建工单。</p>
      <div class="success-actions">
        <el-button type="primary" @click="reset">继续巡检</el-button>
        <el-button @click="switchTab('history')">查看历史</el-button>
      </div>
    </div>

    <!-- 巡检表单 -->
    <div v-else-if="tab === 'submit'" class="insp-form">
      <section class="card gm-fade-up">
        <h3 class="card-title"><span class="step">1</span> 识别设备</h3>
        <div class="scan-row">
          <el-button type="primary" plain class="scan-btn" @click="scanning ? stopScan() : startScan()">
            <AppIcon name="inspection" :size="18" /><span style="margin-left: 6px">{{ scanning ? '停止扫码' : '扫码识别' }}</span>
          </el-button>
          <el-select v-model="deviceCode" placeholder="或手动选择设备" class="dev-sel" filterable>
            <el-option v-for="d in devices" :key="d.device_id" :label="`${d.device_id} · ${d.name}`" :value="d.device_id" />
          </el-select>
        </div>
        <div id="qr-reader" v-show="scanning" class="qr-reader"></div>
        <p v-if="selectedDevice" class="dev-picked"><AppIcon name="check" :size="15" /> 已选：{{ selectedDevice.name }}</p>
      </section>

      <section class="card gm-fade-up">
        <h3 class="card-title"><span class="step">2</span> 检查清单（6 项）</h3>
        <div class="checklist">
          <div v-for="(c, i) in checklist" :key="i" class="check-item" :class="{ abnormal: !c.ok }">
            <div class="check-top">
              <span class="check-name">{{ c.item }}</span>
              <el-switch v-model="c.ok" active-text="正常" inactive-text="异常" inline-prompt />
            </div>
            <el-input v-if="!c.ok" v-model="c.note" size="small" placeholder="异常说明（必填）" class="check-note" />
          </div>
        </div>
      </section>

      <section class="card gm-fade-up">
        <h3 class="card-title"><span class="step">3</span> 现场照片（≤5 张）</h3>
        <el-upload
          list-type="picture-card"
          accept=".jpg,.jpeg,.png"
          :file-list="fileList"
          :http-request="customUpload"
          :limit="5"
          :on-remove="onRemove"
          :on-exceed="() => ElMessage.warning('最多上传 5 张照片')"
        >
          <AppIcon name="spark" :size="22" />
        </el-upload>
      </section>

      <section class="card gm-fade-up">
        <h3 class="card-title"><span class="step">4</span> 签名确认</h3>
        <SignaturePad ref="sigPad" @update="signature = $event" />
        <el-input v-if="hasAbnormal" v-model="abnormalDesc" type="textarea" :rows="2" placeholder="异常描述（可编辑）" class="abnormal-desc" />
      </section>

      <el-button type="primary" size="large" class="submit-btn" :loading="submitting" @click="submit">
        <AppIcon v-if="!submitting" name="check" :size="18" /><span style="margin-left: 6px">提交巡检</span>
      </el-button>
    </div>

    <!-- 历史 -->
    <div v-else class="insp-history">
      <div v-loading="historyLoading" class="hist-list">
        <button v-for="h in historyRows" :key="h.id" class="hist-card gm-fade-up" @click="openDetail(h)">
          <div class="hist-top">
            <strong>{{ h.device_id }}</strong>
            <span class="hist-badge" :class="{ abnormal: h.workorder_id != null }">{{ h.workorder_id != null ? '异常转单' : '正常' }}</span>
          </div>
          <p class="hist-time gm-num">{{ formatDateTime(h.checkin_time) }} · {{ USER_NAME[h.inspector_id] ?? '工程师' }}</p>
        </button>
        <el-empty v-if="!historyLoading && historyRows.length === 0" description="暂无巡检记录" />
      </div>
    </div>

    <!-- 历史详情 -->
    <el-dialog v-model="detailVisible" title="巡检详情" width="520px" :align-center="true" class="hist-dialog">
      <div v-if="detail" class="hd-body">
        <div class="hd-meta">
          <div><span>设备</span><b>{{ detail.device_id }}</b></div>
          <div><span>巡检人</span><b>{{ USER_NAME[detail.inspector_id] ?? '工程师' }}</b></div>
          <div><span>时间</span><b>{{ formatDateTime(detail.checkin_time) }}</b></div>
          <div v-if="detail.workorder_id != null"><span>关联工单</span><b>#{{ detail.workorder_id }}</b></div>
        </div>
        <span class="sec-label">检查清单</span>
        <ul class="hd-check">
          <li v-for="(c, i) in detail.checklist" :key="i" :class="{ abnormal: !c.ok }">
            <AppIcon :name="c.ok ? 'check' : 'alert'" :size="15" />
            <span class="hd-item">{{ c.item }}</span>
            <span class="hd-state">{{ c.ok ? '正常' : '异常' }}</span>
            <span v-if="c.note" class="hd-note">{{ c.note }}</span>
          </li>
        </ul>
        <template v-if="detail.photos.length">
          <span class="sec-label">现场照片</span>
          <div class="hd-photos"><img v-for="(p, i) in detail.photos" :key="i" :src="p" alt="巡检照片" /></div>
        </template>
        <span class="sec-label">签名</span>
        <img v-if="detail.signature_path" :src="detail.signature_path" class="hd-sign" alt="签名" />
        <p v-if="detail.abnormal_desc" class="hd-abnormal">{{ detail.abnormal_desc }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.insp { max-width: 640px; margin: 0 auto; padding: 16px 16px 40px; display: grid; gap: 16px; min-height: 100vh; background: var(--gm-bg); }
.insp-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 0; }
.insp-brand { display: flex; align-items: center; gap: 11px; }
.insp-logo { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; color: #fff; background: linear-gradient(140deg, var(--gm-primary), var(--gm-primary-bright)); }
.insp-brand strong { display: block; font-size: 17px; color: var(--gm-ink); }
.insp-brand small { font-size: 12px; color: var(--gm-ink-faint); }
.insp-tabs { display: flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--gm-surface-3); }
.insp-tabs button { border: none; background: none; cursor: pointer; font-size: 13px; font-weight: 600; padding: 6px 16px; border-radius: 8px; color: var(--gm-ink-soft); }
.insp-tabs button.active { background: var(--gm-surface); color: var(--gm-primary); box-shadow: var(--gm-shadow-sm); }
.insp-form { display: grid; gap: 14px; }
.card { background: var(--gm-surface); border: 1px solid var(--gm-line-soft); border-radius: 16px; padding: 18px; box-shadow: var(--gm-shadow-sm); }
.card-title { display: flex; align-items: center; gap: 9px; margin: 0 0 14px; font-size: 15px; font-weight: 700; color: var(--gm-ink); }
.step { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--gm-primary); color: #fff; font-size: 13px; font-weight: 700; }
.scan-row { display: flex; gap: 10px; flex-wrap: wrap; }
.scan-btn { border-radius: 10px; }
.dev-sel { flex: 1; min-width: 180px; }
.qr-reader { margin-top: 12px; border-radius: 12px; overflow: hidden; }
.dev-picked { display: flex; align-items: center; gap: 6px; margin: 12px 0 0; font-size: 13px; font-weight: 600; color: var(--gm-green); }
.checklist { display: grid; gap: 10px; }
.check-item { padding: 12px 14px; border-radius: 12px; background: var(--gm-surface-2); border: 1px solid var(--gm-line-soft); }
.check-item.abnormal { background: rgba(239, 68, 68, 0.06); border-color: rgba(239, 68, 68, 0.3); }
.check-top { display: flex; align-items: center; justify-content: space-between; }
.check-name { font-size: 14px; font-weight: 600; color: var(--gm-ink); }
.check-note { margin-top: 9px; }
.abnormal-desc { margin-top: 12px; }
.submit-btn { width: 100%; height: 50px; font-size: 16px; border-radius: 13px; background: linear-gradient(120deg, var(--gm-primary), var(--gm-primary-bright)); border: none; box-shadow: 0 10px 24px rgba(15, 118, 110, 0.3); }
.success { display: grid; place-items: center; text-align: center; gap: 12px; padding: 48px 24px; background: var(--gm-surface); border-radius: 20px; border: 1px solid var(--gm-line-soft); box-shadow: var(--gm-shadow-md); }
.success-ico { display: grid; place-items: center; width: 84px; height: 84px; border-radius: 50%; color: #fff; background: linear-gradient(140deg, var(--gm-green), var(--gm-green-bright)); box-shadow: 0 12px 30px rgba(22, 163, 74, 0.35); }
.success h2 { margin: 0; font-size: 22px; color: var(--gm-ink); }
.success-dev { margin: 0; font-size: 13.5px; color: var(--gm-ink-soft); }
.success-wo { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--gm-amber); background: rgba(245, 158, 11, 0.12); padding: 12px 18px; border-radius: 12px; }
.success-wo b { color: var(--gm-red); }
.success-ok { margin: 0; font-size: 13.5px; color: var(--gm-green); }
.success-actions { display: flex; gap: 10px; margin-top: 8px; }
.hist-list { display: grid; gap: 12px; }
.hist-card { width: 100%; text-align: left; cursor: pointer; background: var(--gm-surface); border: 1px solid var(--gm-line-soft); border-radius: 14px; padding: 15px 17px; box-shadow: var(--gm-shadow-sm); font-family: inherit; }
.hist-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.hist-top strong { font-size: 15px; color: var(--gm-ink); }
.hist-badge { font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 999px; color: var(--gm-green); background: rgba(22, 163, 74, 0.12); }
.hist-badge.abnormal { color: var(--gm-amber); background: rgba(245, 158, 11, 0.14); }
.hist-time { margin: 0; font-size: 12.5px; color: var(--gm-ink-faint); }
.hd-body { display: grid; gap: 14px; }
.hd-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 18px; padding: 14px 16px; border-radius: 12px; background: var(--gm-surface-2); }
.hd-meta div { display: flex; flex-direction: column; }
.hd-meta span { font-size: 11.5px; color: var(--gm-ink-faint); }
.hd-meta b { font-size: 13.5px; color: var(--gm-ink); }
.sec-label { font-size: 12px; font-weight: 700; color: var(--gm-primary); }
.hd-check { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
.hd-check li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--gm-ink-soft); padding: 8px 12px; border-radius: 9px; background: var(--gm-surface-2); }
.hd-check li.abnormal { background: rgba(239, 68, 68, 0.07); }
.hd-check li .gm-icon { color: var(--gm-green); flex: none; }
.hd-check li.abnormal .gm-icon { color: var(--gm-red); }
.hd-item { font-weight: 600; color: var(--gm-ink); }
.hd-state { margin-left: auto; font-size: 12px; }
.hd-note { font-size: 12px; color: var(--gm-red); }
.hd-photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.hd-photos img { width: 100%; height: 80px; object-fit: cover; border-radius: 9px; border: 1px solid var(--gm-line-soft); }
.hd-sign { width: 240px; height: 90px; object-fit: contain; border: 1px solid var(--gm-line-soft); border-radius: 9px; background: #fff; }
.hd-abnormal { margin: 0; font-size: 13px; color: var(--gm-red); padding: 10px 14px; border-radius: 10px; background: rgba(239, 68, 68, 0.07); }
:deep(.el-upload--picture-card) { width: 88px; height: 88px; border-radius: 12px; }
:deep(.el-upload-list--picture-card .el-upload-list__item) { width: 88px; height: 88px; border-radius: 12px; }
@media (max-width: 640px) { .insp { padding: 12px 12px 32px; } :deep(.el-dialog) { width: calc(100vw - 24px) !important; } }
</style>
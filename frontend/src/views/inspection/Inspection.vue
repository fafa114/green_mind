<template>
  <div class="inspection">
    <div class="tabs">
      <el-radio-group v-model="tab" size="large">
        <el-radio-button value="form">巡检打卡</el-radio-button>
        <el-radio-button value="history">历史记录</el-radio-button>
      </el-radio-group>
    </div>

    <div v-if="tab === 'form'" class="form-panel">
      <div class="scan-row">
        <el-button type="primary" :disabled="scanning" @click="startScan">
          {{ scanning ? '扫码中…' : (deviceCode ? '重新扫码' : '扫码识别设备') }}
        </el-button>
        <el-input v-model="deviceCode" placeholder="或手动输入设备编号" style="flex: 1" @change="resolveDevice" />
      </div>
      <div v-if="device" class="device-name">设备：{{ device.code }} {{ device.name }}（{{ device.status }}）</div>

      <div class="sec-title">检查清单</div>
      <div v-for="(item, i) in checklist" :key="i" class="check-item">
        <span class="ci-name">{{ i + 1 }}. {{ item.item }}</span>
        <div class="ci-right">
          <el-input v-model="item.note" size="small" placeholder="备注（异常时填写）" class="ci-note" />
          <el-switch v-model="item.ok" active-text="正常" inactive-text="异常" />
        </div>
      </div>

      <div class="sec-title">现场照片（≤5 张）</div>
      <div class="photos">
        <div v-for="(p, i) in photos" :key="i" class="photo">
          <img :src="p" />
          <el-button link type="danger" size="small" @click="photos.splice(i, 1)">删除</el-button>
        </div>
        <label v-if="photos.length < 5" class="add-photo">📷<input type="file" accept="image/jpeg,image/png" @change="addPhoto" /></label>
      </div>

      <div class="sec-title">签名（必填）</div>
      <div class="sig">
        <canvas ref="sigCanvas" width="600" height="200" @touchstart="startDraw" @touchmove="draw" @touchend="endDraw"
          @mousedown="startDraw" @mousemove="draw" @mouseup="endDraw" @mouseleave="endDraw" />
        <div class="sig-btns">
          <el-button size="small" @click="clearSign">清空</el-button>
        </div>
      </div>

      <div class="sec-title">异常说明</div>
      <el-input v-model="abnormalDesc" type="textarea" :rows="2" placeholder="发现异常时填写，将自动生成工单" />

      <el-button type="primary" size="large" class="submit" :loading="submitting" @click="submit">提交巡检</el-button>

      <el-dialog v-model="resultVisible" title="提交成功" width="320px" align-center>
        <div class="result">
          <div class="ok">✓ 巡检记录已保存</div>
          <div v-if="resultWorkorderId" class="wo">
            发现异常，已自动创建工单 <b>#{{ resultWorkorderId }}</b>
          </div>
          <div v-else class="wo no">未发现异常</div>
        </div>
        <template #footer>
          <el-button @click="reset">继续巡检</el-button>
        </template>
      </el-dialog>
    </div>

    <div v-else class="history-panel">
      <div v-for="insp in history.items" :key="insp.id" class="his-card" @click="showDetail(insp)">
        <div class="his-head">#{{ insp.id }} · {{ insp.device_id }} · {{ fmtTime(insp.checkin_time) }}</div>
        <div class="his-meta">
          <el-tag size="small" :type="insp.workorder_id ? 'danger' : 'success'">
            {{ insp.workorder_id ? '异常 → 工单 #' + insp.workorder_id : '正常' }}
          </el-tag>
        </div>
      </div>
      <el-empty v-if="!history.items.length" description="暂无巡检记录" />
      <el-drawer v-model="detailVisible" title="巡检详情" size="360px">
        <template v-if="detail">
          <div class="d-row" v-for="(c, i) in detail.checklist || []" :key="i">
            <span>{{ c.item }}</span>
            <el-tag size="small" :type="c.ok ? 'success' : 'danger'">{{ c.ok ? '正常' : '异常' + (c.note ? '：' + c.note : '') }}</el-tag>
          </div>
          <div v-if="detail.abnormal_desc" class="d-sec">异常说明：{{ detail.abnormal_desc }}</div>
          <div v-if="detail.photos?.length" class="d-sec">照片</div>
          <img v-for="(p, i) in detail.photos || []" :key="i" :src="p" class="d-photo" />
          <div v-if="detail.signature_path" class="d-sec">签名</div>
          <img v-if="detail.signature_path" :src="detail.signature_path" class="d-photo" />
        </template>
      </el-drawer>
    </div>

    <div id="qr-reader" v-show="scanning"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createInspection, listInspections, uploadFile } from '../../api/inspections'
import { listDevices } from '../../api/devices'
import { useUserStore } from '../../stores/user'
import type { ChecklistItem, Device, Inspection, Page } from '../../types'
import { fmtTime } from '../../utils/format'

const CHECK_ITEMS = ['燃烧系统', '烟气净化', 'CEMS 分析仪', '校准状态', '数据上报', '现场环境']

const userStore = useUserStore()
const tab = ref<'form' | 'history'>('form')
const devices = ref<Device[]>([])
const deviceCode = ref('')
const device = ref<Device | null>(null)
const checklist = reactive<ChecklistItem[]>(CHECK_ITEMS.map((item) => ({ item, ok: true, note: '' })))
const photos = ref<string[]>([])
const abnormalDesc = ref('')
const submitting = ref(false)
const resultVisible = ref(false)
const resultWorkorderId = ref<number | null>(null)
const scanning = ref(false)
const history = ref<Page<Inspection>>({ items: [], total: 0, page: 1, page_size: 20 })
const detailVisible = ref(false)
const detail = ref<Inspection | null>(null)

let qrScanner: any = null
let html5Qr: any = null

async function startScan() {
  if (scanning.value) return
  scanning.value = true
  const { Html5Qrcode } = await import('html5-qrcode')
  html5Qr = new Html5Qrcode('qr-reader', { verbose: false })
  try {
    await html5Qr.start({ facingMode: 'environment' }, { fps: 8, qrbox: 220 }, (text: string) => {
      deviceCode.value = text.trim()
      stopScan()
      resolveDevice()
    })
  } catch {
    ElMessage.warning('无法打开摄像头，请手动输入设备编号')
    scanning.value = false
  }
}

async function stopScan() {
  try { await html5Qr?.stop() } catch { /* 忽略 */ }
  html5Qr = null
  qrScanner = null
  scanning.value = false
}

function resolveDevice() {
  device.value = devices.value.find((d) => d.code === deviceCode.value) || null
  if (!device.value) ElMessage.warning('设备编号不存在')
}

async function addPhoto(ev: Event) {
  const file = (ev.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (photos.value.length >= 5) return
  const res = await uploadFile(file)
  photos.value.push(res.path)
  ;(ev.target as HTMLInputElement).value = ''
}

// 签名画布
const sigCanvas = ref<HTMLCanvasElement>()
let drawing = false
let hasStrokes = false

function pos(e: MouseEvent | TouchEvent) {
  const rect = sigCanvas.value!.getBoundingClientRect()
  const scaleX = sigCanvas.value!.width / rect.width
  const scaleY = sigCanvas.value!.height / rect.height
  const t = 'touches' in e ? (e as TouchEvent).touches[0] || (e as TouchEvent).changedTouches[0] : (e as MouseEvent)
  return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
}

function startDraw(e: MouseEvent | TouchEvent) {
  e.preventDefault()
  drawing = true
  const ctx = sigCanvas.value!.getContext('2d')!
  const p = pos(e)
  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
}

function draw(e: MouseEvent | TouchEvent) {
  if (!drawing) return
  e.preventDefault()
  const ctx = sigCanvas.value!.getContext('2d')!
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#303133'
  const p = pos(e)
  ctx.lineTo(p.x, p.y)
  ctx.stroke()
  hasStrokes = true
}

function endDraw() {
  drawing = false
}

function clearSign() {
  const ctx = sigCanvas.value!.getContext('2d')!
  ctx.clearRect(0, 0, sigCanvas.value!.width, sigCanvas.value!.height)
  hasStrokes = false
}

async function submit() {
  if (!deviceCode.value || !device.value) {
    ElMessage.warning('请先扫码或输入设备编号')
    return
  }
  if (!hasStrokes) {
    ElMessage.warning('请签名')
    return
  }
  submitting.value = true
  try {
    const blob: Blob = await new Promise((r) => sigCanvas.value!.toBlob((b) => r(b!), 'image/png'))
    const sigFile = new File([blob], 'signature.png', { type: 'image/png' })
    const sigRes = await uploadFile(sigFile)
    const res = await createInspection({
      device_code: deviceCode.value,
      checklist: checklist.map((c) => ({ item: c.item, ok: c.ok, note: c.note || null })),
      photos: photos.value,
      signature_path: sigRes.path,
      abnormal_desc: abnormalDesc.value || null,
    })
    resultWorkorderId.value = res.workorder_id
    resultVisible.value = true
    loadHistory()
  } finally {
    submitting.value = false
  }
}

function reset() {
  resultVisible.value = false
  deviceCode.value = ''
  device.value = null
  checklist.forEach((c) => { c.ok = true; c.note = '' })
  photos.value = []
  abnormalDesc.value = ''
  clearSign()
}

async function loadHistory() {
  history.value = await listInspections({ page: 1, page_size: 50 })
}

function showDetail(insp: Inspection) {
  detail.value = insp
  detailVisible.value = true
}

onMounted(async () => {
  devices.value = (await listDevices({ page: 1, page_size: 100 })).items
  loadHistory()
})

onBeforeUnmount(stopScan)
</script>

<style scoped>
.inspection { max-width: 680px; margin: 0 auto; background: #fff; border-radius: 8px; padding: 16px; }
.tabs { margin-bottom: 16px; }
.scan-row { display: flex; gap: 10px; }
.device-name { margin: 12px 0; font-weight: 600; }
.sec-title { font-weight: 700; margin: 18px 0 8px; }
.check-item { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dashed #ebeef5; }
.ci-name { font-size: 14px; }
.ci-right { display: flex; align-items: center; gap: 8px; }
.ci-note { width: 160px; }
.photos { display: flex; gap: 10px; flex-wrap: wrap; }
.photo { text-align: center; }
.photo img { width: 90px; height: 90px; object-fit: cover; border-radius: 6px; display: block; }
.add-photo { width: 90px; height: 90px; border: 1px dashed #c0c4cc; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 22px; cursor: pointer; }
.add-photo input { display: none; }
.sig canvas { width: 100%; border: 1px solid #dcdfe6; border-radius: 6px; background: #fafafa; touch-action: none; }
.sig-btns { margin-top: 6px; }
.submit { width: 100%; margin-top: 20px; }
.result { text-align: center; padding: 10px; }
.result .ok { font-size: 16px; color: #67c23a; font-weight: 700; margin-bottom: 10px; }
.result .wo { color: #606266; }
.result .wo b { color: #f56c6c; }
.result .no { color: #67c23a; }
.history-panel { display: flex; flex-direction: column; gap: 10px; }
.his-card { border: 1px solid #ebeef5; border-radius: 6px; padding: 12px; cursor: pointer; }
.his-card:hover { background: #f5f7fa; }
.his-head { font-weight: 600; margin-bottom: 6px; }
.d-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #ebeef5; }
.d-sec { margin-top: 12px; font-weight: 600; }
.d-photo { width: 100%; border: 1px solid #ebeef5; border-radius: 4px; margin-top: 6px; }
#qr-reader { margin-top: 12px; }
</style>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const emit = defineEmits<{ (e: 'update', dataURL: string | null): void }>()

const canvas = ref<HTMLCanvasElement | null>(null)
const hasInk = ref(false)
let ctx: CanvasRenderingContext2D | null = null
let drawing = false
let dpr = 1

function setup(): void {
  const c = canvas.value
  if (!c) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = c.offsetWidth
  const h = 160
  c.width = w * dpr
  c.height = h * dpr
  ctx = c.getContext('2d')
  if (ctx) {
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#10312c'
  }
}

function point(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.value!.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function down(e: PointerEvent): void {
  if (!ctx) return
  drawing = true
  canvas.value?.setPointerCapture(e.pointerId)
  const p = point(e)
  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
}
function move(e: PointerEvent): void {
  if (!drawing || !ctx) return
  const p = point(e)
  ctx.lineTo(p.x, p.y)
  ctx.stroke()
  hasInk.value = true
}
function up(): void {
  if (!drawing) return
  drawing = false
  if (hasInk.value && canvas.value) emit('update', canvas.value.toDataURL('image/png'))
}
function clear(): void {
  if (ctx && canvas.value) {
    ctx.clearRect(0, 0, canvas.value.width / dpr, canvas.value.height / dpr)
  }
  hasInk.value = false
  emit('update', null)
}

onMounted(() => {
  setup()
  window.addEventListener('resize', setup)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', setup)
})

defineExpose({ clear })
</script>

<template>
  <div class="sig-pad">
    <div class="sig-head">
      <span class="sig-label"><AppIcon name="check" :size="15" /> 手写签名（必填）</span>
      <button type="button" class="sig-clear" @click="clear">
        <AppIcon name="close" :size="14" /> 清空
      </button>
    </div>
    <div class="sig-canvas-wrap" :class="{ empty: !hasInk }">
      <canvas
        ref="canvas"
        class="sig-canvas"
        @pointerdown="down"
        @pointermove="move"
        @pointerup="up"
        @pointerleave="up"
      ></canvas>
      <span v-if="!hasInk" class="sig-hint">请在此区域签名</span>
    </div>
  </div>
</template>

<style scoped>
.sig-pad {
  display: grid;
  gap: 8px;
}
.sig-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sig-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--gm-ink-soft);
}
.sig-clear {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--gm-line);
  background: var(--gm-surface);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--gm-ink-soft);
  padding: 4px 11px;
  border-radius: 8px;
}
.sig-clear:hover {
  color: var(--gm-red);
  border-color: rgba(239, 68, 68, 0.3);
}
.sig-canvas-wrap {
  position: relative;
  border: 1.5px dashed var(--gm-line);
  border-radius: 12px;
  background: var(--gm-surface);
  overflow: hidden;
}
.sig-canvas-wrap.empty {
  background: var(--gm-surface-2);
}
.sig-canvas {
  display: block;
  width: 100%;
  height: 160px;
  touch-action: none;
  cursor: crosshair;
}
.sig-hint {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 13px;
  color: var(--gm-ink-faint);
  pointer-events: none;
}
</style>
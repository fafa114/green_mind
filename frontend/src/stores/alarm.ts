// 告警共享 store（002 横幅 / 003 列表实时刷新）。
// 单一 SSE 订阅：横幅队列≤3、断线重连（sse.ts）、按 id 去重、liveAlarms 供列表合并。
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { subscribeAlarms } from '@/utils/sse'
import { toISO8601 } from '@/utils/format'
import type { Alarm, AlarmStreamEvent, PollutantCode } from '@/api/types'

const LIMITS: Record<PollutantCode, number> = { pm: 20, so2: 80, nox: 250, co: 80, hcl: 50 }

export const useAlarmStore = defineStore('alarm', () => {
  const banners = ref<AlarmStreamEvent[]>([])
  const liveAlarms = ref<Alarm[]>([])
  const connected = ref(false)
  const version = ref(0)
  let unsub: (() => void) | null = null

<<<<<<< HEAD
export const useAlarmStore = defineStore('alarm', {
  state: () => ({
    banners: [] as (AlarmEvent & { key: number })[],
    connected: false,
  }),
  actions: {
    start() {
      if (disconnect) return
      disconnect = connectAlarmStream({
        onAlarm: (event) => this.push(event),
        onOpen: () => { this.connected = true },
        onClose: () => { this.connected = false },
      })
    },
    stop() {
      disconnect?.()
      disconnect = null
      this.connected = false
      this.banners = []
    },
    push(event: AlarmEvent) {
      this.banners.unshift({ ...event, key: Date.now() + Math.random() })
      if (this.banners.length > MAX_BANNERS) this.banners.length = MAX_BANNERS
      const key = this.banners[0].key
      setTimeout(() => {
        this.banners = this.banners.filter((b) => b.key !== key)
      }, BANNER_TTL)
    },
  },
})
=======
  function onEvent(ev: AlarmStreamEvent): void {
    banners.value = [...banners.value, ev].slice(-3)
    if (!liveAlarms.value.some((a) => a.id === ev.id)) {
      const now = toISO8601(new Date())
      const alarm: Alarm = {
        id: ev.id,
        device_id: ev.device_id,
        ts: now,
        level: ev.level,
        pollutant: ev.pollutant,
        value: ev.value,
        limit_val: LIMITS[ev.pollutant] ?? 0,
        reason: ev.summary,
        status: 'pending',
        diagnosis: null,
        workorder_id: null,
        created_at: now,
      }
      liveAlarms.value = [alarm, ...liveAlarms.value].slice(0, 30)
    }
    version.value += 1
  }

  function start(): void {
    if (unsub) return
    connected.value = true
    unsub = subscribeAlarms(onEvent)
  }

  function stop(): void {
    unsub?.()
    unsub = null
    connected.value = false
  }

  function dismissBanner(id: number): void {
    banners.value = banners.value.filter((b) => b.id !== id)
  }

  return { banners, liveAlarms, connected, version, start, stop, dismissBanner }
})
>>>>>>> origin/master

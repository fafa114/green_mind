import { defineStore } from 'pinia'
import type { AlarmEvent } from '../types'
import { connectAlarmStream } from '../utils/sse'

const MAX_BANNERS = 3
const BANNER_TTL = 10000

let disconnect: (() => void) | null = null

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

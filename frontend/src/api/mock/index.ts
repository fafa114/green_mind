// Mock 按模块切换机制（research.md R1 / 宪法 IV）。
// VITE_USE_MOCK=false → 一律真实接口；
// VITE_USE_MOCK=true（默认）→ 模块名出现在 VITE_REAL_MODULES 中走真实，其余走 mock。

const globalMock = (import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false'

const realModules = (import.meta.env.VITE_REAL_MODULES ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export function isMockEnabled(module: string): boolean {
  if (!globalMock) return false
  return !realModules.includes(module)
}

/** 当前是否处于演示模式（任一模块仍可能走真实，用于 UI 标识） */
export function isDemoMode(): boolean {
  return globalMock
}

/** 模拟网络延迟，让 loading 态在演示中真实可见 */
export const MOCK_DELAY = 320

export function delay(ms: number = MOCK_DELAY): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
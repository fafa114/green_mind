// 写入口显隐机制（research.md R5 / FR-007）。
// 前端隐藏是第一层，后端 require_role 是最终防线（宪法 V）。
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import type { Role } from '@/api/types'

export function usePermission() {
  const user = useUserStore()
  const role = computed<Role>(() => user.role)
  const isAdmin = computed(() => role.value === 'admin')
  const canWrite = computed(() => role.value !== 'viewer')

  function hasRole(...roles: Role[]): boolean {
    return roles.includes(role.value)
  }

  return { role, isAdmin, canWrite, hasRole }
}
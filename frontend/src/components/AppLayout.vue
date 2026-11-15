<template>
  <div class="app-layout">
    <el-container class="full">
      <el-aside width="220px" class="aside">
        <div class="logo">GreenMind</div>
        <el-menu :default-active="active" router class="menu" background-color="#1d2b36" text-color="#c8d3dc" active-text-color="#409eff">
          <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
            <span>{{ m.title }}</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header class="header">
          <div class="header-title">{{ route.meta.title }}</div>
          <div class="header-right">
            <el-tag v-if="alarmStore.banners.length" type="danger" size="small" effect="dark" class="conn-tag">
              实时告警 {{ alarmStore.banners.length }} 条
            </el-tag>
            <el-tag :type="alarmStore.connected ? 'success' : 'info'" size="small" class="conn-tag">
              {{ alarmStore.connected ? 'SSE 已连接' : 'SSE 未连接' }}
            </el-tag>
            <span class="real-name">{{ userStore.realName }}（{{ roleName(userStore.role) }}）</span>
            <el-button link type="danger" @click="logout">退出</el-button>
          </div>
        </el-header>
        <el-main class="main">
          <AlarmBanner />
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useAlarmStore } from '../stores/alarm'
import { roleName } from '../utils/format'
import AlarmBanner from './AlarmBanner.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const alarmStore = useAlarmStore()

const allMenus = [
  { path: '/dashboard', title: '数据大屏' },
  { path: '/alarms', title: '智能告警' },
  { path: '/predictions', title: '趋势预测' },
  { path: '/workorders', title: '工单看板' },
  { path: '/devices', title: '设备资产' },
  { path: '/inspection', title: '智能巡检（移动端）' },
  { path: '/reports', title: '台账报表' },
  { path: '/assistant', title: 'AI 助手' },
  { path: '/admin/users', title: '用户管理', admin: true },
]

const menus = computed(() => allMenus.filter((m) => !m.admin || userStore.isAdmin))
const active = computed(() => '/' + (route.path.split('/')[1] || 'dashboard') + (route.path.startsWith('/admin') ? route.path.slice(7) : ''))

onMounted(() => alarmStore.start())

function logout() {
  alarmStore.stop()
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-layout { height: 100%; }
.full { height: 100%; }
.aside { background: #1d2b36; display: flex; flex-direction: column; }
.logo { color: #4cc2ff; font-size: 22px; font-weight: 700; padding: 18px 20px; letter-spacing: 1px; }
.menu { border-right: none; flex: 1; }
.header { background: #fff; border-bottom: 1px solid #e4e7ed; display: flex; align-items: center; justify-content: space-between; }
.header-title { font-size: 16px; font-weight: 600; }
.header-right { display: flex; align-items: center; gap: 12px; }
.real-name { color: #606266; font-size: 14px; }
.main { background: #f0f2f5; padding: 16px; min-height: 0; display: flex; flex-direction: column; }
.main > :deep(.assistant-page) { flex: 1; }
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import { businessRoutes } from '@/router/routes'
import { useUserStore } from '@/stores/user'
import { useAlarmStore } from '@/stores/alarm'
import { isDemoMode } from '@/api/mock'
import { ROLE_LABEL } from '@/api/types'

const route = useRoute()
const router = useRouter()
const user = useUserStore()
const alarmStore = useAlarmStore()
const demoMode = isDemoMode()
const mobileOpen = ref(false)

// 全局单一 SSE 订阅：登录后启动，离开应用壳/退出时停止
onMounted(() => {
  alarmStore.start()
})
onBeforeUnmount(() => {
  alarmStore.stop()
})

const isBlank = computed(() => Boolean(route.meta.blank))

// 菜单由路由表按角色过滤生成（单一数据源，research.md R4）
const menu = computed(() =>
  businessRoutes
    .filter((r) => !r.meta?.hidden)
    .filter((r) => {
      const roles = r.meta?.roles
      return !roles || roles.includes(user.role)
    })
    .map((r) => ({
      path: '/' + r.path,
      title: r.meta?.title ?? '',
      icon: r.meta?.icon ?? 'spark',
    })),
)

const currentTitle = computed(() => route.meta.title ?? 'GreenMind')
const roleLabel = computed(() => ROLE_LABEL[user.role])
const initial = computed(() => (user.realName ? user.realName.charAt(0) : 'U'))

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

function onCommand(cmd: string): void {
  if (cmd === 'logout') {
    alarmStore.stop()
    user.logout()
    ElMessage.success('已退出登录')
    router.replace('/login')
  }
}
</script>

<template>
  <!-- 空白布局：登录页 / 巡检 H5 -->
  <router-view v-if="isBlank" />

  <div v-else class="shell">
    <div v-if="mobileOpen" class="overlay" @click="mobileOpen = false"></div>

    <!-- 侧栏 -->
    <aside class="sidebar" :class="{ open: mobileOpen }">
      <div class="side-brand">
        <span class="logo"><AppIcon name="leaf" :size="22" :stroke-width="2" /></span>
        <span class="brand-text">
          <strong>GreenMind</strong>
          <small>气体排放监控</small>
        </span>
      </div>

      <nav class="nav">
        <p class="nav-group">业务导航</p>
        <router-link
          v-for="item in menu"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
          @click="mobileOpen = false"
        >
          <AppIcon :name="item.icon" :size="19" />
          <span class="nav-label">{{ item.title }}</span>
          <span class="nav-bar"></span>
        </router-link>
      </nav>

      <div class="side-foot">
        <div class="env-card">
          <span class="env-dot" :class="{ on: demoMode }"></span>
          <div class="env-text">
            <strong>{{ demoMode ? '演示数据模式' : '真实接口模式' }}</strong>
            <small>v0.1.0 · 001 前端地基</small>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主区 -->
    <div class="main">
      <header class="topbar">
        <button class="menu-btn" aria-label="切换菜单" @click="mobileOpen = !mobileOpen">
          <AppIcon :name="mobileOpen ? 'close' : 'menu'" :size="22" />
        </button>
        <div class="crumb">
          <span class="crumb-root">GreenMind</span>
          <AppIcon name="chevronRight" :size="15" />
          <span class="crumb-title">{{ currentTitle }}</span>
        </div>

        <div class="top-right">
          <span v-if="demoMode" class="demo-pill">
            <span class="gm-live-dot"></span>演示数据
          </span>
          <el-dropdown trigger="click" @command="onCommand">
            <div class="user-chip">
              <span class="avatar" :class="user.role">{{ initial }}</span>
              <span class="user-meta">
                <strong>{{ user.realName }}</strong>
                <span class="role-tag" :class="user.role">{{ roleLabel }}</span>
              </span>
              <AppIcon name="chevronDown" :size="16" />
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <AppIcon name="user" :size="16" />
                  <span style="margin-left: 6px">{{ user.user?.username }}</span>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <AppIcon name="logout" :size="16" />
                  <span style="margin-left: 6px">退出登录</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 250px 1fr;
  min-height: 100vh;
}

/* ---------- 侧栏 ---------- */
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--gm-side-ink);
  background: linear-gradient(180deg, #082f2b 0%, #0f5c54 100%);
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
.sidebar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(400px 200px at 100% 0%, rgba(52, 211, 153, 0.16), transparent 60%);
  pointer-events: none;
}
.side-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 22px 20px;
  position: relative;
  z-index: 1;
}
.logo {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 11px;
  color: #06281f;
  background: linear-gradient(140deg, #a7f3d0, #34d399);
  box-shadow: 0 6px 18px rgba(52, 211, 153, 0.35);
}
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.brand-text strong {
  color: #fff;
  font-size: 17px;
  font-weight: 800;
}
.brand-text small {
  color: var(--gm-side-ink-faint);
  font-size: 11.5px;
}
.nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 14px;
  position: relative;
  z-index: 1;
}
.nav-group {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gm-side-ink-faint);
  margin: 8px 10px 10px;
  font-weight: 700;
}
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  margin-bottom: 4px;
  border-radius: 11px;
  color: rgba(207, 233, 226, 0.82);
  font-size: 14.5px;
  font-weight: 500;
  transition: background 0.16s ease, color 0.16s ease, transform 0.16s ease;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
  transform: translateX(2px);
}
.nav-item.active {
  background: linear-gradient(100deg, rgba(52, 211, 153, 0.22), rgba(52, 211, 153, 0.06));
  color: #fff;
  font-weight: 600;
}
.nav-bar {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: 3px;
  height: 22px;
  border-radius: 999px;
  background: var(--gm-green-bright);
  transition: transform 0.18s ease;
}
.nav-item.active .nav-bar {
  transform: translateY(-50%) scaleY(1);
}
.side-foot {
  padding: 16px;
  position: relative;
  z-index: 1;
}
.env-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(167, 243, 208, 0.12);
}
.env-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--gm-ink-faint);
  flex: none;
}
.env-dot.on {
  background: var(--gm-green-bright);
  box-shadow: 0 0 10px rgba(52, 211, 153, 0.8);
  animation: gm-pulse 1.8s ease-in-out infinite;
}
.env-text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}
.env-text strong {
  color: #fff;
  font-size: 13px;
}
.env-text small {
  color: var(--gm-side-ink-faint);
  font-size: 11px;
}

/* ---------- 主区 ---------- */
.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 16px;
  height: 66px;
  padding: 0 26px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--gm-line-soft);
}
.menu-btn {
  display: none;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--gm-ink-soft);
  padding: 4px;
}
.crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--gm-ink-faint);
  font-size: 14px;
}
.crumb-title {
  color: var(--gm-ink);
  font-weight: 700;
  font-size: 16px;
}
.top-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
}
.demo-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--gm-primary);
  background: var(--gm-primary-soft);
  border: 1px solid rgba(15, 118, 110, 0.16);
}
.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 5px 10px 5px 5px;
  border-radius: 999px;
  transition: background 0.15s ease;
  color: var(--gm-ink-faint);
}
.user-chip:hover {
  background: var(--gm-surface-3);
}
.avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  font-size: 16px;
}
.avatar.admin { background: linear-gradient(140deg, #8b5cf6, #6d28d9); }
.avatar.engineer { background: linear-gradient(140deg, #14b8a6, #0f766e); }
.avatar.viewer { background: linear-gradient(140deg, #38bdf8, #0284c7); }
.user-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.user-meta strong {
  font-size: 14px;
  color: var(--gm-ink);
}
.role-tag {
  font-size: 11px;
  font-weight: 600;
}
.role-tag.admin { color: var(--gm-violet); }
.role-tag.engineer { color: var(--gm-primary); }
.role-tag.viewer { color: var(--gm-blue); }

.content {
  flex: 1;
  padding: 26px;
  overflow-y: auto;
}

.overlay {
  display: none;
}

/* ---------- 响应式 ---------- */
@media (max-width: 900px) {
  .shell {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 50;
    width: 250px;
    transform: translateX(-100%);
    transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(8, 47, 43, 0.4);
    backdrop-filter: blur(2px);
  }
  .menu-btn {
    display: grid;
    place-items: center;
  }
  .crumb-root,
  .crumb .gm-icon {
    display: none;
  }
  .content {
    padding: 18px;
  }
  .user-meta {
    display: none;
  }
}
</style>
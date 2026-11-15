import type { RouteRecordRaw } from 'vue-router'
import type { Role } from '@/api/types'

// 路由 meta 扩展：菜单与守卫的单一数据源（research.md R4）
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    public?: boolean
    blank?: boolean
    hidden?: boolean
    roles?: Role[]
  }
}

const AppLayout = () => import('@/components/AppLayout.vue')
const LoginView = () => import('@/views/login/LoginView.vue')
const DashboardView = () => import('@/views/dashboard/DashboardView.vue')
const AlarmsView = () => import('@/views/alarms/AlarmsView.vue')
const PredictionsView = () => import('@/views/predictions/PredictionsView.vue')
const WorkOrdersView = () => import('@/views/workorders/WorkOrdersView.vue')
const DevicesView = () => import('@/views/devices/DevicesView.vue')
const InspectionView = () => import('@/views/inspection/InspectionView.vue')
const ReportsView = () => import('@/views/reports/ReportsView.vue')
const AssistantView = () => import('@/views/assistant/AssistantView.vue')
const UsersView = () => import('@/views/admin/UsersView.vue')

/** 九个业务路由（001-009 全部实现） */
export const businessRoutes: RouteRecordRaw[] = [
  { path: 'dashboard', name: 'dashboard', component: DashboardView, meta: { title: '监控大屏', icon: 'dashboard' } },
  { path: 'alarms', name: 'alarms', component: AlarmsView, meta: { title: '告警中心', icon: 'alarm' } },
  { path: 'predictions', name: 'predictions', component: PredictionsView, meta: { title: '趋势预测', icon: 'prediction' } },
  { path: 'workorders', name: 'workorders', component: WorkOrdersView, meta: { title: '智能工单', icon: 'workorder' } },
  { path: 'devices', name: 'devices', component: DevicesView, meta: { title: '设备资产', icon: 'device' } },
  { path: 'inspection', name: 'inspection', component: InspectionView, meta: { title: '智能巡检', icon: 'inspection', blank: true } },
  { path: 'reports', name: 'reports', component: ReportsView, meta: { title: '台账报表', icon: 'report' } },
  { path: 'assistant', name: 'assistant', component: AssistantView, meta: { title: '智能助手', icon: 'assistant' } },
  { path: 'admin/users', name: 'admin-users', component: UsersView, meta: { title: '用户管理', icon: 'admin', roles: ['admin'] } },
]

export const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: LoginView, meta: { title: '登录', public: true, blank: true, hidden: true } },
  { path: '/', component: AppLayout, redirect: '/dashboard', children: businessRoutes },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]
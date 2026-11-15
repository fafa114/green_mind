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
    summary?: string
    planned?: string[]
  }
}

const AppLayout = () => import('@/components/AppLayout.vue')
const LoginView = () => import('@/views/login/LoginView.vue')
const DashboardView = () => import('@/views/dashboard/DashboardView.vue')
const AlarmsView = () => import('@/views/alarms/AlarmsView.vue')
const WorkOrdersView = () => import('@/views/workorders/WorkOrdersView.vue')
const UnderConstruction = () => import('@/views/placeholders/UnderConstruction.vue')

/** 九个业务路由（监控大屏为本期骨架，其余为"建设中"占位） */
export const businessRoutes: RouteRecordRaw[] = [
  {
    path: 'dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: { title: '监控大屏', icon: 'dashboard' },
  },
  {
    path: 'alarms',
    name: 'alarms',
    component: AlarmsView,
    meta: { title: '告警中心', icon: 'alarm' },
  },
  {
    path: 'predictions',
    name: 'predictions',
    component: UnderConstruction,
    meta: {
      title: '趋势预测',
      icon: 'prediction',
      summary: '基于历史时序的方向性预测与超标概率可视化。',
      planned: ['历史实线 + 未来 6 点预测虚线', '置信区间面积图', '超标概率柱状图', '驱动因素列表'],
    },
  },
  {
    path: 'workorders',
    name: 'workorders',
    component: WorkOrdersView,
    meta: { title: '智能工单', icon: 'workorder' },
  },
  {
    path: 'devices',
    name: 'devices',
    component: UnderConstruction,
    meta: {
      title: '设备资产',
      icon: 'device',
      summary: '设备台账 CRUD 与健康度评分仪表盘。',
      planned: ['设备表格 + 健康分进度条', '新增 / 编辑（admin）', '健康度仪表盘 + 因素分析', '健康分刷新'],
    },
  },
  {
    path: 'inspection',
    name: 'inspection',
    component: UnderConstruction,
    meta: {
      title: '智能巡检',
      icon: 'inspection',
      blank: true,
      summary: '移动端 H5 巡检：扫码、清单、拍照、签名、异常转工单。',
      planned: ['扫码识别设备', '6 项检查清单', '拍照上传（≤5 张）', 'canvas 签名与提交'],
    },
  },
  {
    path: 'reports',
    name: 'reports',
    component: UnderConstruction,
    meta: {
      title: '台账报表',
      icon: 'report',
      summary: '月度报表生成、Markdown 预览与 PDF/Excel 导出。',
      planned: ['报表列表', 'Markdown 预览', 'PDF / Excel 导出', '按月生成（admin）'],
    },
  },
  {
    path: 'assistant',
    name: 'assistant',
    component: UnderConstruction,
    meta: {
      title: '智能助手',
      icon: 'assistant',
      summary: '基于工具调用的数据问答，流式输出与证据引用。',
      planned: ['会话列表（新建 / 删除 / 切换）', '流式打字机渲染', 'Markdown 消息', '数据工具问答'],
    },
  },
  {
    path: 'admin/users',
    name: 'admin-users',
    component: UnderConstruction,
    meta: {
      title: '用户管理',
      icon: 'admin',
      roles: ['admin'],
      summary: '账号与角色管理（仅管理员可见）。',
      planned: ['用户列表', '新增 / 编辑 / 删除', '角色分配', '密码重置'],
    },
  },
]

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { title: '登录', public: true, blank: true, hidden: true },
  },
  {
    path: '/',
    component: AppLayout,
    redirect: '/dashboard',
    children: businessRoutes,
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]
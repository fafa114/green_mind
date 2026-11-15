<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import { useUserStore } from '@/stores/user'
import { isDemoMode } from '@/api/mock'

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const errorMsg = ref('')
const showPwd = ref(false)
const demoMode = isDemoMode()

const demoAccounts = [
  { username: 'admin', label: '管理员', tone: 'admin' },
  { username: 'engineer1', label: '工程师', tone: 'engineer' },
  { username: 'engineer2', label: '工程师', tone: 'engineer' },
  { username: 'viewer', label: '查看者', tone: 'viewer' },
]

const features = [
  { icon: 'gauge', title: '回放监控', desc: '五污染物实测 / 折算切换，工况与质量标记可见' },
  { icon: 'alarm', title: '告警诊断', desc: '规则告警聚合，AI 根因分析与证据引用' },
  { icon: 'workorder', title: '闭环运维', desc: '告警自动派单，SLA 倒计时与验收关闭' },
]

function fill(username: string): void {
  form.username = username
  form.password = '123456'
  errorMsg.value = ''
}

async function submit(): Promise<void> {
  errorMsg.value = ''
  if (!form.username.trim() || !form.password) {
    errorMsg.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  try {
    await user.login(form.username.trim(), form.password)
    const raw = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    // 仅允许站内路径，防开放重定向
    const target = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard'
    ElMessage.success(`欢迎回来，${user.realName}`)
    await router.replace(target)
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } }; message?: string }
    errorMsg.value = err.response?.data?.detail || err.message || '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <!-- 品牌面板 -->
    <section class="brand">
      <div class="aurora aurora-a"></div>
      <div class="aurora aurora-b"></div>
      <div class="grain"></div>
      <div class="grid-lines"></div>
      <span class="particle p1"></span>
      <span class="particle p2"></span>
      <span class="particle p3"></span>
      <span class="particle p4"></span>

      <div class="brand-inner">
        <div class="brand-top gm-fade-up">
          <span class="logo">
            <AppIcon name="leaf" :size="26" :stroke-width="2" />
          </span>
          <span class="wordmark">GreenMind</span>
          <span class="tag">CEMS</span>
        </div>

        <div class="hero gm-fade-up" style="animation-delay: 0.08s">
          <p class="eyebrow">气体排放监控系统</p>
          <h1>让每一缕排放<br /><em>可测 · 可溯 · 可控</em></h1>
          <p class="lede">历史回放监控 · 规则告警 · 工单闭环 · 智能分析</p>
        </div>

        <!-- 排放波形 -->
        <div class="wave gm-fade-up" style="animation-delay: 0.16s">
          <svg viewBox="0 0 520 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id="waveFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#34d399" stop-opacity="0.45" />
                <stop offset="100%" stop-color="#34d399" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="waveLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#34d399" />
                <stop offset="55%" stop-color="#38bdf8" />
                <stop offset="100%" stop-color="#a7f3d0" />
              </linearGradient>
            </defs>
            <path
              class="wave-area"
              d="M0 80 C60 40 100 96 150 70 C200 44 240 92 300 64 C360 36 400 88 460 58 C490 44 510 60 520 52 L520 120 L0 120 Z"
              fill="url(#waveFill)"
            />
            <path
              class="wave-line"
              d="M0 80 C60 40 100 96 150 70 C200 44 240 92 300 64 C360 36 400 88 460 58 C490 44 510 60 520 52"
              fill="none"
              stroke="url(#waveLine)"
              stroke-width="2.5"
              stroke-linecap="round"
            />
            <line x1="0" y1="40" x2="520" y2="40" stroke="#f59e0b" stroke-opacity="0.5" stroke-width="1" stroke-dasharray="5 6" />
          </svg>
          <span class="wave-label">排放趋势 · 标准线</span>
        </div>

        <ul class="features">
          <li v-for="(f, i) in features" :key="f.title" class="gm-fade-up" :style="{ animationDelay: `${0.24 + i * 0.08}s` }">
            <span class="f-ico"><AppIcon :name="f.icon" :size="20" /></span>
            <span class="f-text"><strong>{{ f.title }}</strong>{{ f.desc }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- 登录表单 -->
    <section class="panel">
      <div class="card gm-fade-up">
        <header class="card-head">
          <h2>登录工作台</h2>
          <p>使用演示账号进入系统，体验完整监控流程</p>
        </header>

        <el-alert
          v-if="errorMsg"
          :title="errorMsg"
          type="error"
          show-icon
          :closable="true"
          class="err"
          @close="errorMsg = ''"
        />

        <form class="form" @submit.prevent="submit">
          <label class="field">
            <span class="field-label">用户名</span>
            <el-input
              v-model="form.username"
              size="large"
              placeholder="请输入用户名"
              autocomplete="username"
              @keyup.enter="submit"
            >
              <template #prefix><AppIcon name="user" :size="18" /></template>
            </el-input>
          </label>

          <label class="field">
            <span class="field-label">密码</span>
            <el-input
              v-model="form.password"
              size="large"
              :type="showPwd ? 'text' : 'password'"
              placeholder="请输入密码"
              autocomplete="current-password"
              @keyup.enter="submit"
            >
              <template #prefix><AppIcon name="lock" :size="18" /></template>
              <template #suffix>
                <button type="button" class="pwd-toggle" :aria-label="showPwd ? '隐藏密码' : '显示密码'" @click="showPwd = !showPwd">
                  <AppIcon name="eye" :size="18" />
                </button>
              </template>
            </el-input>
          </label>

          <el-button
            type="primary"
            size="large"
            native-type="submit"
            :loading="loading"
            class="submit"
          >
            <span v-if="!loading">登 录</span>
            <span v-else>正在验证…</span>
          </el-button>
        </form>

        <div class="divider"><span>演示账号 · 密码均为 123456</span></div>

        <div class="chips">
          <button
            v-for="acc in demoAccounts"
            :key="acc.username"
            type="button"
            class="chip"
            :class="`tone-${acc.tone}`"
            @click="fill(acc.username)"
          >
            <strong>{{ acc.username }}</strong>
            <span>{{ acc.label }}</span>
          </button>
        </div>

        <p class="mode" :class="{ on: demoMode }">
          <span class="gm-live-dot" v-if="demoMode"></span>
          {{ demoMode ? '演示数据模式 · 后端未连接也可独立运行' : '真实接口模式 · 连接后端服务' }}
        </p>
      </div>
      <p class="copyright">GreenMind · 垃圾焚烧烟气 CEMS 监控 · 第一期历史回放</p>
    </section>
  </div>
</template>

<style scoped>
.login {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  min-height: 100vh;
}

/* ---------- 品牌面板 ---------- */
.brand {
  position: relative;
  overflow: hidden;
  color: var(--gm-side-ink);
  background: linear-gradient(150deg, #082f2b 0%, #0f766e 46%, #0c5a53 72%, #0b3a4a 100%);
  display: flex;
  align-items: center;
  padding: 56px;
}
.aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.55;
  pointer-events: none;
}
.aurora-a {
  width: 460px;
  height: 460px;
  top: -120px;
  right: -80px;
  background: radial-gradient(circle, rgba(52, 211, 153, 0.7), transparent 65%);
  animation: gm-drift 16s ease-in-out infinite;
}
.aurora-b {
  width: 420px;
  height: 420px;
  bottom: -140px;
  left: -100px;
  background: radial-gradient(circle, rgba(14, 165, 233, 0.55), transparent 65%);
  animation: gm-drift 20s ease-in-out infinite reverse;
}
.grain {
  position: absolute;
  inset: 0;
  opacity: 0.06;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
  pointer-events: none;
}
.grid-lines {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(circle at 30% 40%, black, transparent 78%);
  pointer-events: none;
}
.particle {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(167, 243, 208, 0.8);
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.8);
  animation: gm-drift 12s ease-in-out infinite;
}
.p1 { top: 22%; left: 18%; }
.p2 { top: 64%; left: 72%; width: 4px; height: 4px; animation-duration: 15s; }
.p3 { top: 38%; left: 84%; width: 5px; height: 5px; animation-duration: 18s; }
.p4 { top: 80%; left: 30%; width: 4px; height: 4px; animation-duration: 14s; }

.brand-inner {
  position: relative;
  z-index: 2;
  max-width: 520px;
  width: 100%;
}
.brand-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
}
.logo {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 13px;
  color: #06281f;
  background: linear-gradient(140deg, #a7f3d0, #34d399);
  box-shadow: 0 8px 24px rgba(52, 211, 153, 0.4);
}
.wordmark {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #fff;
}
.tag {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid rgba(167, 243, 208, 0.4);
  color: #a7f3d0;
}
.eyebrow {
  font-size: 13px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #7fd6c6;
  font-weight: 700;
  margin: 0 0 14px;
}
.hero h1 {
  font-size: clamp(30px, 3.4vw, 46px);
  line-height: 1.18;
  margin: 0 0 16px;
  color: #fff;
  font-weight: 800;
}
.hero h1 em {
  font-style: normal;
  background: linear-gradient(100deg, #a7f3d0, #38bdf8);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.lede {
  margin: 0;
  color: rgba(207, 233, 226, 0.82);
  font-size: 15px;
}
.wave {
  position: relative;
  margin: 34px 0;
  height: 120px;
}
.wave svg {
  width: 100%;
  height: 100%;
}
.wave-line {
  stroke-dasharray: 1400;
  stroke-dashoffset: 1400;
  animation: wave-draw 2.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards;
}
@keyframes wave-draw {
  to { stroke-dashoffset: 0; }
}
.wave-label {
  position: absolute;
  right: 4px;
  top: 26px;
  font-size: 11px;
  color: rgba(245, 158, 11, 0.9);
  letter-spacing: 0.04em;
}
.features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 16px;
}
.features li {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.f-ico {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: 11px;
  color: #a7f3d0;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(167, 243, 208, 0.18);
}
.f-text {
  font-size: 13.5px;
  color: rgba(207, 233, 226, 0.78);
  line-height: 1.5;
}
.f-text strong {
  display: block;
  color: #fff;
  font-size: 15px;
  margin-bottom: 2px;
}

/* ---------- 表单面板 ---------- */
.panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  background:
    radial-gradient(700px 360px at 80% 0%, rgba(20, 184, 166, 0.08), transparent 60%),
    var(--gm-bg);
}
.card {
  width: 100%;
  max-width: 420px;
  background: var(--gm-surface);
  border: 1px solid var(--gm-line-soft);
  border-radius: 20px;
  box-shadow: var(--gm-shadow-lg);
  padding: 38px 36px 30px;
}
.card-head h2 {
  margin: 0 0 6px;
  font-size: 25px;
  font-weight: 800;
  color: var(--gm-ink);
}
.card-head p {
  margin: 0 0 24px;
  color: var(--gm-ink-soft);
  font-size: 14px;
}
.err {
  margin-bottom: 18px;
}
.form {
  display: grid;
  gap: 18px;
}
.field {
  display: block;
}
.field-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--gm-ink-soft);
  margin-bottom: 7px;
}
.field :deep(.el-input__wrapper) {
  border-radius: 11px;
  box-shadow: 0 0 0 1px var(--gm-line) inset;
  padding: 4px 14px;
}
.field :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1.5px var(--gm-primary) inset;
}
.field :deep(.el-input__prefix) {
  color: var(--gm-ink-faint);
}
.pwd-toggle {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--gm-ink-faint);
  display: grid;
  place-items: center;
  padding: 0;
}
.pwd-toggle:hover {
  color: var(--gm-primary);
}
.submit {
  width: 100%;
  height: 48px;
  font-size: 16px;
  letter-spacing: 0.2em;
  border-radius: 11px;
  margin-top: 4px;
  background: linear-gradient(120deg, var(--gm-primary), var(--gm-primary-bright));
  border: none;
  box-shadow: 0 10px 24px rgba(15, 118, 110, 0.32);
}
.submit:hover {
  background: linear-gradient(120deg, var(--gm-primary-strong), var(--gm-primary));
}
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 26px 0 16px;
  color: var(--gm-ink-faint);
  font-size: 12px;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--gm-line);
}
.chips {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 14px;
  border-radius: 11px;
  border: 1px solid var(--gm-line);
  background: var(--gm-surface-2);
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  text-align: left;
}
.chip strong {
  font-size: 14px;
  color: var(--gm-ink);
}
.chip span {
  font-size: 11.5px;
  color: var(--gm-ink-faint);
}
.chip:hover {
  transform: translateY(-2px);
  border-color: var(--gm-primary-bright);
  box-shadow: var(--gm-shadow-sm);
}
.chip.tone-admin:hover { border-color: var(--gm-violet); }
.chip.tone-engineer:hover { border-color: var(--gm-primary-bright); }
.chip.tone-viewer:hover { border-color: var(--gm-blue); }
.mode {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  margin: 22px 0 0;
  font-size: 12px;
  color: var(--gm-ink-faint);
}
.mode.on {
  color: var(--gm-primary);
}
.copyright {
  margin: 22px 0 0;
  font-size: 12px;
  color: var(--gm-ink-faint);
}

/* ---------- 响应式 ---------- */
@media (max-width: 900px) {
  .login {
    grid-template-columns: 1fr;
  }
  .brand {
    padding: 36px 28px;
    min-height: auto;
  }
  .brand-inner {
    max-width: 100%;
  }
  .brand-top {
    margin-bottom: 24px;
  }
  .hero h1 {
    font-size: 28px;
  }
  .wave,
  .features {
    display: none;
  }
  .panel {
    padding: 32px 20px 48px;
  }
}
</style>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { usePermission } from '@/utils/permission'

const route = useRoute()
const { canWrite, role } = usePermission()

const title = computed(() => route.meta.title ?? '')
const icon = computed(() => route.meta.icon ?? 'spark')
const summary = computed(() => route.meta.summary ?? '')
const planned = computed(() => route.meta.planned ?? [])
</script>

<template>
  <div class="uc">
    <div class="uc-card gm-fade-up">
      <div class="halo">
        <span class="halo-ring"></span>
        <span class="halo-ico"><AppIcon :name="icon" :size="34" :stroke-width="1.6" /></span>
      </div>

      <p class="eyebrow">建设中 · Coming soon</p>
      <h1>{{ title }}</h1>
      <p class="summary">{{ summary }}</p>

      <ul v-if="planned.length" class="planned">
        <li v-for="(item, i) in planned" :key="item" :style="{ animationDelay: `${0.1 + i * 0.06}s` }" class="gm-fade-up">
          <AppIcon name="check" :size="15" :stroke-width="2.4" />
          <span>{{ item }}</span>
        </li>
      </ul>

      <div class="foot">
        <span class="perm" :class="{ write: canWrite }">
          <AppIcon :name="canWrite ? 'shield' : 'eye'" :size="15" />
          {{ canWrite ? `可操作角色 · ${role}` : '只读视图 · viewer' }}
        </span>
        <router-link to="/dashboard" class="back">
          <AppIcon name="dashboard" :size="16" />
          返回监控大屏
        </router-link>
      </div>

      <p class="note">该模块将在后续 feature 交付，当前不展示任何虚构业务数值。</p>
    </div>
  </div>
</template>

<style scoped>
.uc {
  display: grid;
  place-items: center;
  min-height: calc(100vh - 180px);
  padding: 20px;
}
.uc-card {
  position: relative;
  width: 100%;
  max-width: 560px;
  text-align: center;
  background:
    radial-gradient(500px 220px at 50% -10%, rgba(20, 184, 166, 0.1), transparent 65%),
    var(--gm-surface);
  border: 1px solid var(--gm-line-soft);
  border-radius: 22px;
  box-shadow: var(--gm-shadow-md);
  padding: 46px 44px 34px;
  overflow: hidden;
}
.halo {
  position: relative;
  width: 92px;
  height: 92px;
  margin: 0 auto 22px;
  display: grid;
  place-items: center;
}
.halo-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg, var(--gm-primary-bright), var(--gm-blue-bright), var(--gm-green-bright), var(--gm-primary-bright));
  opacity: 0.18;
  animation: spin 9s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.halo-ico {
  position: relative;
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  color: var(--gm-primary);
  background: var(--gm-primary-soft);
  border: 1px solid rgba(15, 118, 110, 0.16);
}
.eyebrow {
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--gm-primary);
  font-weight: 700;
  margin: 0 0 10px;
}
.uc-card h1 {
  margin: 0 0 12px;
  font-size: 28px;
  font-weight: 800;
  color: var(--gm-ink);
}
.summary {
  margin: 0 auto 26px;
  max-width: 420px;
  color: var(--gm-ink-soft);
  font-size: 14.5px;
  line-height: 1.6;
}
.planned {
  list-style: none;
  margin: 0 auto 28px;
  padding: 0;
  max-width: 380px;
  display: grid;
  gap: 10px;
  text-align: left;
}
.planned li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 15px;
  border-radius: 11px;
  background: var(--gm-surface-2);
  border: 1px solid var(--gm-line-soft);
  color: var(--gm-ink-soft);
  font-size: 13.5px;
}
.planned li .gm-icon {
  color: var(--gm-green);
  flex: none;
}
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding-top: 22px;
  border-top: 1px solid var(--gm-line-soft);
}
.perm {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 600;
  padding: 6px 13px;
  border-radius: 999px;
  color: var(--gm-blue);
  background: rgba(14, 165, 233, 0.1);
}
.perm.write {
  color: var(--gm-primary);
  background: var(--gm-primary-soft);
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--gm-primary);
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(15, 118, 110, 0.24);
  transition: background 0.15s ease, transform 0.15s ease;
}
.back:hover {
  background: var(--gm-primary-soft);
  transform: translateY(-1px);
}
.note {
  margin: 20px 0 0;
  font-size: 12px;
  color: var(--gm-ink-faint);
}
</style>
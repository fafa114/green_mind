<script setup lang="ts">
// 根组件：仅承载路由视图与过渡。布局由 AppLayout / 空白布局按路由 meta 决定。
</script>

<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>
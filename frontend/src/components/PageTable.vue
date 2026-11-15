<template>
  <div class="page-table">
    <el-table :data="data.items" v-loading="loading" border stripe size="default">
      <slot />
    </el-table>
    <el-pagination
      v-if="data.total > (query.page_size || 20)"
      class="pager"
      layout="total, prev, pager, next"
      :total="data.total"
      :page-size="query.page_size || 20"
      :current-page="query.page || 1"
      @current-change="onPage"
    />
  </div>
</template>

<script setup lang="ts">
import type { Page } from '../types'

const props = defineProps<{
  data: Page<any>
  query: { page?: number; page_size?: number; [k: string]: any }
  loading?: boolean
}>()

const emit = defineEmits<{ (e: 'change', query: any): void }>()

function onPage(page: number) {
  emit('change', { ...props.query, page })
}
</script>

<style scoped>
.pager { margin-top: 12px; justify-content: flex-end; }
</style>

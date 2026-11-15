<script setup lang="ts" generic="T">
// 统一分页表格封装（FR-013）。page 默认 1，page_size 默认 20 最大 100。
// 首个列表类业务 feature（003 告警）做端到端验证。
const props = withDefaults(
  defineProps<{
    data: T[]
    total: number
    page?: number
    pageSize?: number
    loading?: boolean
  }>(),
  { page: 1, pageSize: 20, loading: false },
)

const emit = defineEmits<{
  (e: 'update:page', value: number): void
  (e: 'update:pageSize', value: number): void
  (e: 'change', payload: { page: number; pageSize: number }): void
}>()

function onCurrent(p: number): void {
  emit('update:page', p)
  emit('change', { page: p, pageSize: props.pageSize })
}
function onSize(s: number): void {
  emit('update:pageSize', s)
  emit('update:page', 1)
  emit('change', { page: 1, pageSize: s })
}
</script>

<template>
  <div class="page-table">
    <el-table v-loading="loading" :data="data" stripe style="width: 100%">
      <slot />
      <template #empty>
        <div class="empty">
          <slot name="empty">暂无数据</slot>
        </div>
      </template>
    </el-table>
    <div class="pager">
      <el-pagination
        background
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="onCurrent"
        @size-change="onSize"
      />
    </div>
  </div>
</template>

<style scoped>
.page-table {
  background: var(--gm-surface);
  border: 1px solid var(--gm-line-soft);
  border-radius: var(--gm-radius);
  padding: 8px 8px 14px;
}
.pager {
  display: flex;
  justify-content: flex-end;
  padding: 14px 10px 0;
}
.empty {
  padding: 32px 0;
  color: var(--gm-ink-faint);
}
</style>
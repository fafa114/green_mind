<template>
  <el-tag :type="type" effect="dark" size="small">{{ label }}</el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ level: string }>()

const type = computed(() => ({ red: 'danger', orange: 'warning', yellow: 'warning' } as Record<string, any>)[props.level] || 'info')
const label = computed(() => ({ red: '红', orange: '橙', yellow: '黄' } as Record<string, string>)[props.level] || props.level)
</script>

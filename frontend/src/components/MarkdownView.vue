<template>
  <div ref="mdEl" class="markdown-view" v-html="html"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps<{ content?: string | null }>()

const md = new MarkdownIt({ html: false, linkify: true, breaks: true })

const html = computed(() => {
  const cleaned = (props.content || '').replace(/^```(markdown)?\s*\n?/, '').replace(/\n?```\s*$/g, '')
  return md.render(cleaned)
})
</script>

<style scoped>
.markdown-view { font-size: 14px; line-height: 1.7; color: #303133; }
.markdown-view :deep(h1), .markdown-view :deep(h2), .markdown-view :deep(h3) { margin: 14px 0 8px; }
.markdown-view :deep(p) { margin: 8px 0; }
.markdown-view :deep(table) { border-collapse: collapse; margin: 10px 0; }
.markdown-view :deep(th), .markdown-view :deep(td) { border: 1px solid #dcdfe6; padding: 6px 12px; }
.markdown-view :deep(code) { background: #f4f4f5; padding: 2px 5px; border-radius: 3px; }
.markdown-view :deep(ul), .markdown-view :deep(ol) { padding-left: 22px; }
</style>

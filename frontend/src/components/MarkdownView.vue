<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps<{ source: string }>()

// html:false 转义原始 HTML，防注入；linkify 自动链接；breaks 换行
const md = new MarkdownIt({ html: false, linkify: true, breaks: true })
const html = computed(() => md.render(props.source || ''))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="md-view" v-html="html"></div>
</template>

<style scoped>
.md-view {
  font-size: 14px;
  line-height: 1.75;
  color: var(--gm-ink);
  word-break: break-word;
}
.md-view :deep(h1) {
  font-size: 22px;
  font-weight: 800;
  margin: 0 0 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--gm-primary-soft);
  color: var(--gm-ink);
}
.md-view :deep(h2) {
  font-size: 17px;
  font-weight: 700;
  margin: 24px 0 12px;
  padding-left: 11px;
  border-left: 4px solid var(--gm-primary);
  color: var(--gm-ink);
}
.md-view :deep(h3) {
  font-size: 15px;
  font-weight: 700;
  margin: 18px 0 8px;
  color: var(--gm-ink);
}
.md-view :deep(p) {
  margin: 0 0 12px;
  color: var(--gm-ink-soft);
}
.md-view :deep(ul),
.md-view :deep(ol) {
  margin: 0 0 12px;
  padding-left: 22px;
  color: var(--gm-ink-soft);
}
.md-view :deep(li) {
  margin-bottom: 5px;
}
.md-view :deep(a) {
  color: var(--gm-primary);
  text-decoration: underline;
}
.md-view :deep(strong) {
  color: var(--gm-ink);
  font-weight: 700;
}
.md-view :deep(blockquote) {
  margin: 0 0 12px;
  padding: 10px 16px;
  border-left: 4px solid var(--gm-primary-bright);
  background: var(--gm-primary-soft);
  border-radius: 0 8px 8px 0;
  color: var(--gm-ink-soft);
}
.md-view :deep(code) {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12.5px;
  background: var(--gm-surface-3);
  padding: 2px 6px;
  border-radius: 5px;
  color: var(--gm-primary-strong);
}
.md-view :deep(pre) {
  background: #0b2f2b;
  color: #d7efe9;
  padding: 14px 16px;
  border-radius: 10px;
  overflow-x: auto;
  margin: 0 0 12px;
}
.md-view :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}
.md-view :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 16px;
  font-size: 13px;
}
.md-view :deep(th) {
  background: var(--gm-primary-soft);
  color: var(--gm-primary-strong);
  font-weight: 700;
  text-align: left;
  padding: 9px 12px;
  border: 1px solid var(--gm-line);
}
.md-view :deep(td) {
  padding: 8px 12px;
  border: 1px solid var(--gm-line-soft);
  color: var(--gm-ink-soft);
}
.md-view :deep(tr:nth-child(even) td) {
  background: var(--gm-surface-2);
}
.md-view :deep(hr) {
  border: none;
  border-top: 1px solid var(--gm-line);
  margin: 18px 0;
}
</style>
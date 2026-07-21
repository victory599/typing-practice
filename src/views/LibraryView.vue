<template>
  <div>
    <h1 class="page-title">词库</h1>
    <p class="page-desc">新增、编辑或删除练习文本。数据保存在本机数据目录中。</p>

    <p v-if="error" class="error-text">{{ error }}</p>
    <p v-if="okMsg" class="muted">{{ okMsg }}</p>

    <section class="panel form">
      <h2>{{ editingId ? '编辑文本' : '新增文本' }}</h2>
      <div class="field">
        <label for="title">标题</label>
        <input id="title" v-model="title" type="text" maxlength="120" />
      </div>
      <div class="field">
        <label for="content">正文</label>
        <textarea id="content" v-model="content" />
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" :disabled="saving" @click="save">
          {{ editingId ? '保存修改' : '添加' }}
        </button>
        <button v-if="editingId" type="button" class="btn btn-secondary" @click="cancelEdit">
          取消编辑
        </button>
      </div>
    </section>

    <ul class="list">
      <li v-for="t in texts" :key="t.id" class="panel item">
        <div>
          <h3>{{ t.title }}</h3>
          <p class="preview">{{ preview(t.content) }}</p>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-secondary" @click="startEdit(t)">编辑</button>
          <button type="button" class="btn btn-danger" @click="remove(t.id)">删除</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as api from '../api/client'
import type { PracticeText } from '../types'

const texts = ref<PracticeText[]>([])
const title = ref('')
const content = ref('')
const editingId = ref<string | null>(null)
const saving = ref(false)
const error = ref('')
const okMsg = ref('')

function preview(text: string) {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > 100 ? `${one.slice(0, 100)}…` : one
}

async function load() {
  error.value = ''
  try {
    texts.value = await api.listTexts()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  }
}

function startEdit(t: PracticeText) {
  editingId.value = t.id
  title.value = t.title
  content.value = t.content
  okMsg.value = ''
}

function cancelEdit() {
  editingId.value = null
  title.value = ''
  content.value = ''
}

async function save() {
  error.value = ''
  okMsg.value = ''
  saving.value = true
  try {
    if (editingId.value) {
      await api.updateText(editingId.value, title.value, content.value)
      okMsg.value = '已保存修改'
    } else {
      await api.createText(title.value, content.value)
      okMsg.value = '已添加文本'
    }
    cancelEdit()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function remove(id: string) {
  if (!confirm('确定删除这篇练习文本吗？')) return
  error.value = ''
  try {
    await api.deleteText(id)
    if (editingId.value === id) cancelEdit()
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '删除失败'
  }
}

onMounted(load)
</script>

<style scoped>
.form {
  margin-bottom: 1.5rem;
}

.form h2,
.item h3 {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.preview {
  margin: 0;
  color: var(--ink-muted);
  line-height: 1.45;
  font-size: 0.92rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .item {
    flex-direction: column;
  }
}
</style>

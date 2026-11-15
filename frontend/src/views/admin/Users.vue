<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" size="small" @click="openCreate">新增用户</el-button>
      <el-button size="small" @click="load">刷新</el-button>
    </div>

    <PageTable :data="page" :query="query" :loading="loading" @change="load">
      <el-table-column label="ID" prop="id" width="70" />
      <el-table-column label="用户名" prop="username" width="150" />
      <el-table-column label="真实姓名" prop="real_name" width="150" />
      <el-table-column label="角色" width="110">
        <template #default="{ row }">
          <el-tag size="small" :type="row.role === 'admin' ? 'danger' : row.role === 'engineer' ? 'primary' : 'info'">
            {{ roleName(row.role) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">{{ fmtTime(row.created_at) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" :disabled="row.id === userStore.user?.id" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </PageTable>

    <el-dialog v-model="formVisible" :title="editing ? '编辑用户' : '新增用户'" width="420px">
      <el-form label-width="100px">
        <el-form-item label="用户名"><el-input v-model="form.username" :disabled="!!editing" /></el-form-item>
        <el-form-item label="真实姓名"><el-input v-model="form.real_name" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="admin" /><el-option label="工程师" value="engineer" /><el-option label="查看者" value="viewer" />
          </el-select>
        </el-form-item>
        <el-form-item :label="editing ? '重置密码' : '密码'">
          <el-input v-model="form.password" type="password" show-password :placeholder="editing ? '留空则不修改' : '至少 6 位'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageTable from '../../components/PageTable.vue'
import { createUser, deleteUser, listUsers, updateUser } from '../../api/users'
import { useUserStore } from '../../stores/user'
import type { Page, User } from '../../types'
import { fmtTime, roleName } from '../../utils/format'

const userStore = useUserStore()
const query = reactive({ page: 1, page_size: 20 })
const page = ref<Page<User>>({ items: [], total: 0, page: 1, page_size: 20 })
const loading = ref(false)
const formVisible = ref(false)
const editing = ref<User | null>(null)
const form = reactive({ username: '', real_name: '', role: 'viewer', password: '' })

async function load(q = query) {
  loading.value = true
  try {
    page.value = await listUsers(q)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  Object.assign(form, { username: '', real_name: '', role: 'viewer', password: '' })
  formVisible.value = true
}

function openEdit(row: User) {
  editing.value = row
  Object.assign(form, { username: row.username, real_name: row.real_name || '', role: row.role, password: '' })
  formVisible.value = true
}

async function save() {
  if (editing.value) {
    const body: Record<string, any> = { real_name: form.real_name || null, role: form.role }
    if (form.password) body.password = form.password
    await updateUser(editing.value.id, body)
  } else {
    if (!form.username || !form.password || form.password.length < 6) {
      ElMessage.warning('请填写用户名和至少 6 位密码')
      return
    }
    await createUser({ username: form.username, password: form.password, real_name: form.real_name || undefined, role: form.role })
  }
  formVisible.value = false
  ElMessage.success('已保存')
  load()
}

async function remove(row: User) {
  await ElMessageBox.confirm(`确认删除用户 ${row.username}？`, '删除确认', { type: 'warning' })
  await deleteUser(row.id)
  ElMessage.success('已删除')
  load()
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; gap: 10px; margin-bottom: 12px; background: #fff; padding: 10px 12px; border-radius: 6px; }
</style>

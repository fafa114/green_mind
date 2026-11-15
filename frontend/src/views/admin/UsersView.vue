<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import PageTable from '@/components/PageTable.vue'
import { fetchUsers, createUser, updateUser, removeUser } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { ROLE_LABEL, type AdminUser, type Role } from '@/api/types'
import { formatDateTime } from '@/utils/format'

const user = useUserStore()
const actor = computed(() => ({ id: user.user?.id ?? 0, role: user.role }))

const rows = ref<AdminUser[]>([])
const loading = ref(false)
const formVisible = ref(false)
const editing = ref<AdminUser | null>(null)
const saving = ref(false)
const form = reactive({ username: '', real_name: '', role: 'engineer' as Role, password: '' })

const roleColor: Record<Role, string> = { admin: '#8b5cf6', engineer: '#0f766e', viewer: '#0ea5e9' }

async function load(): Promise<void> {
  loading.value = true
  try {
    rows.value = await fetchUsers(actor.value)
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '用户加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  editing.value = null
  Object.assign(form, { username: '', real_name: '', role: 'engineer', password: '' })
  formVisible.value = true
}
function openEdit(row: AdminUser): void {
  editing.value = row
  Object.assign(form, { username: row.username, real_name: row.real_name, role: row.role, password: '' })
  formVisible.value = true
}

async function save(): Promise<void> {
  if (!editing.value && !form.username.trim()) { ElMessage.warning('请填写用户名'); return }
  if (!form.real_name.trim()) { ElMessage.warning('请填写真实姓名'); return }
  if (!editing.value && !form.password) { ElMessage.warning('请填写密码'); return }
  saving.value = true
  try {
    if (editing.value) {
      await updateUser(editing.value.id, { real_name: form.real_name, role: form.role, password: form.password || undefined }, actor.value)
      ElMessage.success('用户已更新')
    } else {
      await createUser({ username: form.username, real_name: form.real_name, role: form.role, password: form.password }, actor.value)
      ElMessage.success('用户已创建')
    }
    formVisible.value = false
    await load()
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '保存失败')
  } finally {
    saving.value = false
  }
}

async function resetPassword(row: AdminUser): Promise<void> {
  try {
    const { value } = await ElMessageBox.prompt(`为「${row.real_name}」设置新密码`, '重置密码', { inputPattern: /.{6,}/, inputErrorMessage: '密码至少 6 位', confirmButtonText: '重置', cancelButtonText: '取消' })
    await updateUser(row.id, { password: value }, actor.value)
    ElMessage.success('密码已重置')
  } catch {
    // 取消
  }
}

async function remove(row: AdminUser): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除用户「${row.real_name}」？`, '删除用户', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
  } catch {
    return
  }
  try {
    await removeUser(row.id, actor.value)
    ElMessage.success('用户已删除')
    await load()
  } catch (e) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err.response?.data?.detail || '删除失败')
  }
}

onMounted(load)
</script>

<template>
  <div class="users">
    <header class="page-head gm-fade-up">
      <div>
        <p class="eyebrow">系统管理 · 仅管理员</p>
        <h1>用户管理</h1>
      </div>
      <el-button type="primary" size="large" @click="openCreate">
        <AppIcon name="spark" :size="16" /><span style="margin-left: 6px">新增用户</span>
      </el-button>
    </header>

    <PageTable :data="rows" :total="rows.length" :page="1" :page-size="20" :loading="loading" class="gm-fade-up">
      <el-table-column prop="username" label="用户名" width="150" />
      <el-table-column prop="real_name" label="真实姓名" min-width="150" />
      <el-table-column label="角色" width="120">
        <template #default="{ row }">
          <span class="role-tag" :style="{ '--rc': roleColor[row.role as Role] }">{{ ROLE_LABEL[row.role as Role] }}</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }"><span class="gm-num">{{ formatDateTime(row.created_at) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" width="220" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="resetPassword(row)">重置密码</el-button>
          <el-button link type="danger" :disabled="row.id === actor.id" @click="remove(row)">
            {{ row.id === actor.id ? '本人' : '删除' }}
          </el-button>
        </template>
      </el-table-column>
    </PageTable>

    <el-dialog v-model="formVisible" :title="editing ? '编辑用户' : '新增用户'" width="480px" :align-center="true">
      <el-form label-position="top">
        <el-form-item label="用户名" required>
          <el-input v-model="form.username" :disabled="!!editing" placeholder="登录用户名" />
        </el-form-item>
        <el-form-item label="真实姓名" required>
          <el-input v-model="form.real_name" placeholder="如 赵工程师" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="admin" /><el-option label="工程师" value="engineer" /><el-option label="查看者" value="viewer" />
          </el-select>
        </el-form-item>
        <el-form-item :label="editing ? '新密码（留空不改）' : '密码'" :required="!editing">
          <el-input v-model="form.password" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.users { display: grid; gap: 18px; }
.page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.eyebrow { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gm-primary); font-weight: 700; margin: 0 0 6px; }
.page-head h1 { margin: 0; font-size: 27px; font-weight: 800; color: var(--gm-ink); }
.role-tag { font-size: 12px; font-weight: 700; padding: 3px 11px; border-radius: 999px; color: var(--rc); background: color-mix(in srgb, var(--rc) 14%, transparent); }
</style>
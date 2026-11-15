<template>
  <div class="login-page">
    <div class="login-card">
      <div class="title">GreenMind</div>
      <div class="subtitle">智慧化气体排放监控系统</div>
      <el-form :model="form" @keyup.enter="submit" size="large">
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名" prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-button type="primary" class="submit" :loading="loading" @click="submit">登 录</el-button>
      </el-form>
      <div class="hint">请使用管理员创建的账号登录</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '../../api/auth'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const form = reactive({ username: '', password: '' })
const loading = ref(false)

async function submit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    const res = await login(form.username, form.password)
    userStore.setLogin(res.token, res.user)
    ElMessage.success(`欢迎，${res.user.real_name || res.user.username}`)
    router.push((route.query.redirect as string) || '/dashboard')
  } catch {
    /* 拦截器已提示 */
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page { height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0d1a26 0%, #14303f 100%); }
.login-card { width: 380px; background: rgba(255,255,255,.96); border-radius: 12px; padding: 40px 36px; box-shadow: 0 10px 40px rgba(0,0,0,.35); }
.title { font-size: 28px; font-weight: 800; color: #1d2b36; text-align: center; letter-spacing: 2px; }
.subtitle { color: #7d93a8; text-align: center; margin: 8px 0 28px; font-size: 14px; }
.submit { width: 100%; margin-top: 4px; }
.hint { margin-top: 18px; color: #909399; font-size: 12px; text-align: center; }
</style>

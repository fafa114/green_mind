import type { User } from '../../types'

const ACCOUNTS: Record<string, { user: User; password: string }> = {
  admin: { password: '123456', user: { id: 1, username: 'admin', real_name: '系统管理员', role: 'admin' } },
  engineer1: { password: '123456', user: { id: 2, username: 'engineer1', real_name: '张工程师', role: 'engineer' } },
  engineer2: { password: '123456', user: { id: 3, username: 'engineer2', real_name: '李工程师', role: 'engineer' } },
  viewer: { password: '123456', user: { id: 4, username: 'viewer', real_name: '王查看', role: 'viewer' } },
}

export function mockLogin(username: string, password: string): Promise<{ token: string; user: User }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const acc = ACCOUNTS[username]
      if (!acc || acc.password !== password) {
        const err: any = new Error('用户名或密码错误')
        err.response = { status: 401, data: { detail: '用户名或密码错误' } }
        reject(err)
        return
      }
      resolve({ token: 'mock-token-' + username, user: acc.user })
    }, 300)
  })
}

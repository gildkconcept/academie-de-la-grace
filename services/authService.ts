// services/authService.ts
import { LoginInput, RegisterInput } from '@/lib/validators'

export const authService = {
  async login(data: LoginInput) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    })
    return res.json()
  },

  async register(data: RegisterInput) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  async verify() {
    const res = await fetch('/api/auth/verify', {
      credentials: 'include'
    })
    return res.json()
  },

  async logout() {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })
    return res.json()
  },

  async checkUsername(username: string) {
    const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`)
    return res.json()
  },

  async verifyRecovery(data: { phone: string; fullName: string; branch: string; serviceId: string }) {
    const res = await fetch('/api/auth/verify-recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return res.json()
  },

  async resetAccount(data: { recoveryToken: string; newUsername: string; newPassword: string }) {
    const res = await fetch('/api/auth/reset-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    })
    return res.json()
  }
}
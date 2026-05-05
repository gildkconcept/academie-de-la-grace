// services/profileService.ts

export const profileService = {
  async update(data: {
    name: string
    username: string
    email?: string
    phone?: string
    baptized?: boolean
    maisonGrace?: string
  }) {
    const res = await fetch('/api/profile/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    })
    return res.json()
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const res = await fetch('/api/profile/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword })
    })
    return res.json()
  }
}
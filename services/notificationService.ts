// services/notificationService.ts

export const notificationService = {
  async getAll(limit = 50, unreadOnly = false) {
    const url = `/api/notifications?limit=${limit}${unreadOnly ? '&unread=true' : ''}`
    const res = await fetch(url, { credentials: 'include' })
    return res.json()
  },

  async markAsRead(id: string) {
    const res = await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      credentials: 'include'
    })
    return res.json()
  },

  async markAllAsRead() {
    const res = await fetch('/api/notifications/read-all', {
      method: 'PATCH',
      credentials: 'include'
    })
    return res.json()
  },

  async delete(id: string) {
    const res = await fetch(`/api/notifications/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    return res.json()
  },

  async create(data: {
    userIds: string[]
    title: string
    message: string
    type: string
    link?: string
  }) {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    })
    return res.json()
  }
}
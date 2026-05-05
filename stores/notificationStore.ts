// stores/notificationStore.ts
import { create } from 'zustand'
import { Notification } from '@/types'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  fetchNotifications: (unreadOnly?: boolean) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: true,

  fetchNotifications: async (unreadOnly = false) => {
    set({ loading: true })
    try {
      const url = `/api/notifications?limit=50${unreadOnly ? '&unread=true' : ''}`
      const res = await fetch(url, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        set({ notifications: data.notifications || [], unreadCount: data.unreadCount || 0, loading: false })
      }
    } catch (error) {
      console.error('Erreur fetch notifications:', error)
      set({ loading: false })
    }
  },

  markAsRead: async (id) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH', credentials: 'include' })
      set(state => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, is_read: true } : n),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }))
    } catch (error) {
      console.error('Erreur markAsRead:', error)
    }
  },

  markAllAsRead: async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH', credentials: 'include' })
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }))
    } catch (error) {
      console.error('Erreur markAllAsRead:', error)
    }
  },

  deleteNotification: async (id) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE', credentials: 'include' })
      set(state => {
        const deleted = state.notifications.find(n => n.id === id)
        return {
          notifications: state.notifications.filter(n => n.id !== id),
          unreadCount: deleted && !deleted.is_read ? Math.max(0, state.unreadCount - 1) : state.unreadCount
        }
      })
    } catch (error) {
      console.error('Erreur deleteNotification:', error)
    }
  }
}))
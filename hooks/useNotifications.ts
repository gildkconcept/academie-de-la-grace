// hooks/useNotifications.ts
'use client'

import { useEffect } from 'react'
import { useNotificationStore } from '@/stores/notificationStore'

export function useNotifications() {
  const notifications = useNotificationStore(state => state.notifications)
  const unreadCount = useNotificationStore(state => state.unreadCount)
  const loading = useNotificationStore(state => state.loading)
  const fetchNotifications = useNotificationStore(state => state.fetchNotifications)
  const markAsRead = useNotificationStore(state => state.markAsRead)
  const markAllAsRead = useNotificationStore(state => state.markAllAsRead)
  const deleteNotification = useNotificationStore(state => state.deleteNotification)

  useEffect(() => {
    fetchNotifications()
    // ✅ Notifications toutes les 3 minutes (180000 ms) au lieu de 30 secondes
    const interval = setInterval(() => fetchNotifications(), 180000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications
  }
}
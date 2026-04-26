// components/NotificationCenter.tsx
'use client'

import { useNotifications } from '@/hooks/useNotifications'
import { useRouter } from 'next/navigation'
import { XMarkIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Notification } from '@/types'

interface NotificationCenterProps {
  onClose: () => void
}

export const NotificationCenter = ({ onClose }: NotificationCenterProps) => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const router = useRouter()

  const handleClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
      onClose()
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'session': return '📅'
      case 'seance': return '⛪'
      case 'quiz': return '📝'
      case 'result': return '🏆'
      case 'promotion': return '⬆️'
      case 'absence': return '⚠️'
      case 'announcement': return '📢'
      default: return '🔔'
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      
      {/* Panneau */}
      <div className="absolute right-0 top-0 md:right-4 md:top-16 w-full md:w-96 h-full md:h-[600px] md:max-h-[80vh] bg-white md:rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h3 className="font-bold text-lg">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-500">{unreadCount} non lue(s)</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                title="Tout marquer comme lu"
              >
                <CheckIcon className="w-4 h-4" />
                Tout lire
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg md:hidden">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">🔔</p>
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-indigo-50/50 border-l-4 border-l-indigo-500' : ''
                }`}
              >
                <div className="flex gap-3">
                  <span className="text-xl mt-1">{getIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'} truncate`}>
                        {notification.title}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 shrink-0"
                        title="Supprimer"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
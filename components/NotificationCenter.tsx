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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Panneau */}
<div className="fixed inset-0 md:absolute md:right-4 md:top-16 md:inset-auto md:w-96 md:h-[600px] md:max-h-[80vh] flex flex-col"
        style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
        
        {/* Fond du panneau */}
        <div className="absolute inset-0 bg-cover bg-center md:rounded-xl overflow-hidden" style={{ backgroundImage: "url('/ok.png')" }} />
        <div className="absolute inset-0 md:rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.96) 0%, rgba(15,45,130,0.94) 40%, rgba(10,30,100,0.95) 70%, rgba(4,12,65,0.97) 100%)' }} />
        
        {/* Contenu */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-white/[0.08]">
            <div>
              <h3 className="font-normal text-white text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <p className="text-xs text-white/50">{unreadCount} non lue(s)</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-300/80 hover:text-blue-200 flex items-center gap-1 transition-colors"
                  title="Tout marquer comme lu"
                >
                  <CheckIcon className="w-4 h-4" />
                  Tout lire
                </button>
              )}
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg md:hidden">
                <XMarkIcon className="w-5 h-5 text-white/60" />
              </button>
            </div>
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto" style={{ minHeight: '200px' }}>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-4xl mb-2">🔔</p>
                <p className="text-sm text-white/40">Aucune notification</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className={`p-4 border-b border-white/[0.05] hover:bg-white/[0.04] cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-indigo-500/10 border-l-2 border-l-indigo-400' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="text-xl mt-1">{getIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-sm ${!notification.is_read ? 'font-semibold text-white' : 'font-medium text-white/70'} truncate`}>
                          {notification.title}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notification.id)
                          }}
                          className="p-1 text-white/30 hover:text-red-400 shrink-0 transition-colors"
                          title="Supprimer"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-white/50 mt-1 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-white/30 mt-1">
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
    </div>
  )
}
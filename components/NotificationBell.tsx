// components/NotificationBell.tsx
'use client'

import { useState } from 'react'
import { BellIcon } from '@heroicons/react/24/outline'
import { BellAlertIcon } from '@heroicons/react/24/solid'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationCenter } from './NotificationCenter'

export const NotificationBell = () => {
  const { unreadCount, loading } = useNotifications()
  const [showCenter, setShowCenter] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowCenter(!showCenter)}
        className="relative p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        title="Notifications"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="w-5 h-5 text-blue-300 animate-pulse" />
        ) : (
          <BellIcon className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showCenter && (
        <NotificationCenter onClose={() => setShowCenter(false)} />
      )}
    </>
  )
}
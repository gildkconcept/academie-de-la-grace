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
        className="relative p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        title="Notifications"
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="w-6 h-6 text-indigo-600 animate-pulse" />
        ) : (
          <BellIcon className="w-6 h-6" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
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
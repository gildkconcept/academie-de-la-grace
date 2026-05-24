// components/LiveStatus.tsx
'use client'

import { useState } from 'react'
import { useLiveStatus } from '@/hooks/useLiveStatus'

export const LiveStatus = () => {
  const { currentTime, currentTimeWithSeconds, isOnline, connectedDuration } = useLiveStatus()
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative">
      <div 
        className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 bg-white/10 rounded-full text-xs cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Point vert animé */}
        <div className="relative">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`} />
          {isOnline && (
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75" />
          )}
        </div>
        
        {/* Heure */}
        <span className="text-white/80 text-xs sm:text-sm font-mono">
          {currentTime}
        </span>
        
        {/* Indicateur LIVE (desktop) */}
        <span className="hidden sm:inline text-[9px] font-bold text-red-400 uppercase tracking-wider animate-pulse">
          LIVE
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && isOnline && (
        <div className="absolute top-full mt-2 left-0 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-2 whitespace-nowrap z-50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>Connecté depuis {connectedDuration || 'maintenant'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
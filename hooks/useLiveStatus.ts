// hooks/useLiveStatus.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import axiosInstance from '@/lib/axios'  

export function useLiveStatus() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isOnline, setIsOnline] = useState(true)
  const [connectedSince, setConnectedSince] = useState<Date | null>(null)
  const pathname = usePathname()

  // Mettre à jour l'heure chaque minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Heartbeat toutes les 5 minutes (300 secondes)
  const sendHeartbeat = useCallback(async () => {
    try {
      // Déterminer la page actuelle
      let currentPage = 'Dashboard'
      if (pathname?.includes('/quiz')) currentPage = 'Quiz'
      else if (pathname?.includes('/chat')) currentPage = 'Chat'
      else if (pathname?.includes('/profile')) currentPage = 'Profil'
      else if (pathname?.includes('/superadmin')) currentPage = 'Admin'
      else if (pathname?.includes('/manager')) currentPage = 'Manager'
      
      // ✅ Remplacer fetch par axiosInstance
      const response = await axiosInstance.post('/live/heartbeat', { currentPage })
      
      if (response.data?.data?.connected_at && !connectedSince) {
        setConnectedSince(new Date(response.data.data.connected_at))
      }
      setIsOnline(true)
    } catch (error) {
      console.error('Heartbeat error:', error)
    }
  }, [pathname, connectedSince])

  useEffect(() => {
    sendHeartbeat()
    // Heartbeat toutes les 2 minutes
    const interval = setInterval(sendHeartbeat, 120000)
    return () => clearInterval(interval)
  }, [sendHeartbeat])

  // Gérer la fermeture de l'onglet (fetch nu car sendBeacon ne supporte pas axios)
  useEffect(() => {
    const handleBeforeUnload = () => {
      navigator.sendBeacon('/api/live/heartbeat', JSON.stringify({ isOnline: false }))
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const formatTime = (date: Date, withSeconds = false) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: withSeconds ? '2-digit' : undefined
    })
  }

  const getConnectedDuration = () => {
    if (!connectedSince) return null
    const diff = Date.now() - connectedSince.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (3600000)) / 60000)
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`
    }
    return `${minutes}min`
  }

  return {
    currentTime: formatTime(currentTime),
    currentTimeWithSeconds: formatTime(currentTime, true),
    isOnline,
    connectedSince,
    connectedDuration: getConnectedDuration()
  }
}
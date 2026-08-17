// hooks/useLiveStatus.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import axiosInstance from '@/lib/axios'

// 🔧 FIX : navigator.sendBeacon a besoin d'une URL ABSOLUE vers le backend.
// Une URL relative comme '/api/live/heartbeat' part vers ton frontend
// Vercel (qui n'a pas cette route) et échoue silencieusement, jamais
// vers ton VPS. On reproduit EXACTEMENT la même construction d'URL que
// lib/axios.ts (baseURL = `${API_URL}/api`), fallback IP:port inclus,
// pour être certain que sendBeacon tape sur la même route que le reste
// de l'app.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://85.31.238.112:3001'
const API_BASE_URL = `${API_URL}/api`

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

  // Heartbeat toutes les 2 minutes (120 secondes)
  const sendHeartbeat = useCallback(async () => {
    try {
      let currentPage = 'Dashboard'
      if (pathname?.includes('/quiz')) currentPage = 'Quiz'
      else if (pathname?.includes('/chat')) currentPage = 'Chat'
      else if (pathname?.includes('/profile')) currentPage = 'Profil'
      else if (pathname?.includes('/superadmin')) currentPage = 'Admin'
      else if (pathname?.includes('/manager')) currentPage = 'Manager'

      const response = await axiosInstance.post('/live/heartbeat', { currentPage })

      if (response.data?.data?.connected_at && !connectedSince) {
        setConnectedSince(new Date(response.data.data.connected_at))
      }
      setIsOnline(true)
    } catch (error: any) {
      // 🔧 FIX : si le backend renvoie 429 (rate limit heartbeat), ce n'est
      // pas une vraie erreur de connexion — on ne casse pas le statut "en ligne"
      // pour un heartbeat en trop qui a été throttled côté serveur.
      if (error?.response?.status === 429) {
        console.warn('Heartbeat throttled (429), ignoré côté UI')
        return
      }
      console.error('Heartbeat error:', error)
      setIsOnline(false)
    }
  }, [pathname, connectedSince])

  useEffect(() => {
    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, 120000)
    return () => clearInterval(interval)
  }, [sendHeartbeat])

  // Gérer la fermeture de l'onglet
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!API_BASE_URL) return
      // 🔧 FIX : URL absolue vers le backend, plus vers le frontend Next.js
      navigator.sendBeacon(
        `${API_BASE_URL}/live/heartbeat`,
        new Blob([JSON.stringify({ isOnline: false })], { type: 'application/json' })
      )
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
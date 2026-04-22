'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetch('/api/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            console.log('📦 Données utilisateur reçues de verify:', data.user)
            setUser({
              id: data.user.id,
              name: data.user.name,
              username: data.user.username,
              role: data.user.role,
              serviceId: data.user.serviceId,
              email: data.user.email || '',
              phone: data.user.phone || '',
              level: data.user.level || 1,
              maisonGrace: data.user.maisonGrace || null  // ← AJOUT
            })
          } else {
            localStorage.removeItem('token')
          }
        })
        .catch(error => {
          console.error('❌ Erreur auth:', error)
          localStorage.removeItem('token')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    router.push('/login')
  }

  return { user, loading, logout }
}
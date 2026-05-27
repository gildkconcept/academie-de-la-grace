'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/services/authService'
import { User } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    authService.verify()
      .then(data => {
        if (data.user) {
          setUser({
            id: data.user.id,
            name: data.user.name,
            username: data.user.username,
            role: data.user.role,
            serviceId: data.user.serviceId,
            email: data.user.email || '',
            phone: data.user.phone || '',
            level: data.user.level || 1,
            maisonGrace: data.user.maisonGrace || null,
            profileImageUrl: data.user.profileImageUrl || null
          })
        } else {
          localStorage.removeItem('token')
        }
      })
      .catch(() => {
        localStorage.removeItem('token')
      })
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await authService.logout()
    setUser(null)
    router.push('/login')
  }

  return { user, loading, logout }
}
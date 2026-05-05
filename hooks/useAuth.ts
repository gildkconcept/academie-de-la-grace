'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Le cookie est envoyé automatiquement, plus besoin de le lire depuis localStorage
    fetch('/api/auth/verify', {
      credentials: 'include' // ← Envoie le cookie HttpOnly automatiquement
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
            maisonGrace: data.user.maisonGrace || null,
            profileImageUrl: data.user.profileImageUrl || null
          })
        } else {
          // Pas d'utilisateur → rediriger vers login (sauf si déjà sur login)
          if (window.location.pathname !== '/login' && 
              window.location.pathname !== '/register' &&
              window.location.pathname !== '/forgot-credentials') {
            router.push('/login')
          }
        }
      })
      .catch(error => {
        console.error('❌ Erreur auth:', error)
      })
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    try {
      // Appeler l'API logout pour supprimer le cookie côté serveur
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Erreur logout:', error)
    } finally {
      setUser(null)
      // ✅ Utiliser window.location pour une redirection forcée
      window.location.href = '/login'
    }
  }

  return { user, loading, logout }
}
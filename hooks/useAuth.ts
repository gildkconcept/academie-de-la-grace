// hooks/useAuth.ts
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axiosInstance from '@/lib/axios'

interface User {
    id: string
    name: string
    username: string
    role: string
    serviceId?: string
    email?: string
    phone?: string
    level?: number
    maisonGrace?: string
    profileImageUrl?: string
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const fetchUser = async () => {
        const token = localStorage.getItem('token')
        if (!token) {
            setUser(null)
            setLoading(false)
            return
        }

        try {
            const response = await axiosInstance.get('/auth/verify')
            const userData = response.data.user
            if (userData) {
                setUser({
                    id: userData.id,
                    name: userData.name || userData.full_name,
                    username: userData.username,
                    role: userData.role,
                    serviceId: userData.serviceId || userData.service_id,
                    email: userData.email,
                    phone: userData.phone,
                    level: userData.level,
                    maisonGrace: userData.maisonGrace || userData.maison_grace,
                    profileImageUrl: userData.profileImageUrl || userData.profile_image_url
                })
            } else {
                localStorage.removeItem('token')
                setUser(null)
            }
        } catch (error) {
            console.error('❌ Erreur verification:', error)
            localStorage.removeItem('token')
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUser()
    }, [])

    const refreshUser = async () => {
        setLoading(true)
        await fetchUser()
        return user
    }

    const login = async (username: string, password: string) => {
        try {
            const response = await axiosInstance.post('/auth/login', { username, password })
            const data = response.data
            if (data.success) {
                localStorage.setItem('token', data.token)
                await fetchUser()
                return { success: true, user: data.user }
            }
            return { success: false, error: data.error }
        } catch (error: any) {
            return { success: false, error: error.response?.data?.error || 'Erreur de connexion' }
        }
    }

    const logout = async () => {
        localStorage.removeItem('token')
        setUser(null)
        router.push('/login')
    }

    return { user, loading, login, logout, refreshUser }
}
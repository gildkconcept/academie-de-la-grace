'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'
import { CreateNoPhoneStudent } from '@/components/CreateNoPhoneStudent'

export default function NoPhonePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    if (user && user.role !== 'superadmin') {
      router.push('/dashboard/student')
    }
  }, [user, loading, router])

  const handleClose = () => {
    setIsOpen(false)
    router.push('/dashboard/superadmin')
  }

  const handleSuccess = () => {
    setIsOpen(false)
    router.push('/dashboard/superadmin')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a1a5a 0%, #0f2d82 50%, #0a1e64 100%)' }}>
        <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user || user.role !== 'superadmin') return null

  return (
    <div className="min-h-screen relative" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
      {/* Fond */}
      <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
      <div className="fixed inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.94) 0%, rgba(15,45,130,0.9) 40%, rgba(10,30,100,0.92) 70%, rgba(4,12,65,0.96) 100%)' }} />
      
      <div className="relative z-30">
        {/* Header */}
        <div className="bg-[rgba(5,15,70,0.6)] backdrop-blur-2xl border-b border-white/[0.08] sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/dashboard/superadmin')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeftIcon className="w-5 h-5 text-white/60" />
              </button>
              <div className="flex items-center gap-2">
                <DevicePhoneMobileIcon className="w-6 h-6 text-purple-400" />
                <h1 className="text-xl sm:text-2xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Étudiants sans téléphone
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <CreateNoPhoneStudent 
            isOpen={isOpen}
            onClose={handleClose}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  )
}
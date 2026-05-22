'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { LoginIntro } from '@/components/auth/LoginIntro'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [userData, setUserData] = useState<{ name: string; role: string; level?: number } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (res.ok) {
        console.log('Données utilisateur reçues:', data.user) // Vérification
        // Stocker les données utilisateur
        setUserData({
          name: data.user.name || data.user.username,
          role: data.user.role,
          level: data.user.level
        })
        setShowIntro(true)
      } else {
        toast.error(data.error || 'Erreur de connexion')
        setLoading(false)
      }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      toast.error('Une erreur est survenue')
      setLoading(false)
    }
  }

  // Afficher l'intro seulement si showIntro est true ET userData existe
  if (showIntro && userData) {
    return <LoginIntro userData={userData} />
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ fontFamily: "'Crimson Text', Georgia, serif", color: 'white' }}>
      
      <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
      <div className="fixed inset-0 z-10" style={{ 
        background: 'linear-gradient(135deg, rgba(8,20,90,0.88) 0%, rgba(15,45,130,0.82) 40%, rgba(10,30,100,0.87) 70%, rgba(4,12,65,0.92) 100%)' 
      }} />
      
      <div className="fixed w-[280px] h-[280px] rounded-full bg-blue-400/20 blur-[80px] -top-[40px] -right-[40px] z-20 pointer-events-none" />
      <div className="fixed w-[250px] h-[250px] rounded-full bg-blue-600/15 blur-[80px] bottom-[10%] -left-[40px] z-20 pointer-events-none" />

      <div className="relative z-30 w-full max-w-md px-4 py-12">
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-sm font-bold text-[#1a3a8f] mx-auto mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            AG
          </div>
          <h1 className="text-3xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Académie de la Grâce
          </h1>
          <p className="text-blue-200/70 text-xs mt-2">Connectez-vous à votre compte</p>
        </div>

        <div className="bg-white/[0.07] backdrop-blur-3xl border border-white/[0.18] rounded-3xl p-8 shadow-[0_32px_64px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nom d'utilisateur"
                className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-sm"
              />
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>

            <div className="text-right">
              <Link href="/forgot-credentials" className="text-xs text-blue-300/70 hover:text-blue-200 transition-colors">
                Nom d'utilisateur ou mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-[#1a3a8f] py-2.5 rounded-lg text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
              style={{ fontFamily: "'Crimson Text', serif" }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p className="text-center text-xs text-blue-200/50 mt-6">
            Pas encore inscrit ?{' '}
            <Link href="/register" className="text-white hover:underline font-semibold">
              Créer un compte
            </Link>
          </p>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-blue-200/40 hover:text-white/60 transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
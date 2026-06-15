'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { LoginIntro } from '@/components/auth/LoginIntro'
import { authService } from '@/services/authService'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showIntro, setShowIntro] = useState(false)
    const [userData, setUserData] = useState<{ name: string; role: string; level?: number } | null>(null)
    const [blockedUntil, setBlockedUntil] = useState<Date | null>(null)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const data = await authService.login({ username, password })

            if (data.success) {
                setUserData({
                    name: data.user.name || data.user.username,
                    role: data.user.role,
                    level: data.user.level
                })
                setShowIntro(true)
            } else {
                // Afficher le message d'erreur avec les tentatives restantes
                let errorMessage = data.error || 'Erreur de connexion'
                
                if (data.attemptsLeft !== undefined && data.attemptsLeft > 0) {
                    errorMessage = `${errorMessage} - Il vous reste ${data.attemptsLeft} tentative(s)`
                    toast.error(errorMessage)
                } else if (data.minutesLeft !== undefined) {
                    errorMessage = `${errorMessage} - Réessayez dans ${data.minutesLeft} minute(s)`
                    setBlockedUntil(new Date(Date.now() + data.minutesLeft * 60 * 1000))
                    toast.error(errorMessage)
                } else {
                    toast.error(errorMessage)
                }
                setLoading(false)
            }
        } catch (error) {
            console.error('Erreur de connexion:', error)
            toast.error('Impossible de se connecter au serveur')
            setLoading(false)
        }
    }

    // Afficher le temps restant si bloqué
    const getRemainingTime = () => {
        if (!blockedUntil) return null
        const remaining = Math.ceil((blockedUntil.getTime() - Date.now()) / 60000)
        if (remaining <= 0) {
            setBlockedUntil(null)
            return null
        }
        return remaining
    }

    if (showIntro && userData) {
        return <LoginIntro userData={userData} />
    }

    const remainingMinutes = getRemainingTime()

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ fontFamily: "'Crimson Text', Georgia, serif", color: 'white' }}>
            <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
            <div className="fixed inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.88) 0%, rgba(15,45,130,0.82) 40%, rgba(10,30,100,0.87) 70%, rgba(4,12,65,0.92) 100%)' }} />

            <div className="relative z-30 w-full max-w-md px-4 py-12">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-sm font-bold text-[#1a3a8f] mx-auto mb-3">
                        AG
                    </div>
                    <h1 className="text-3xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Académie de la Grâce
                    </h1>
                    <p className="text-blue-200/70 text-xs mt-2">Connectez-vous à votre compte</p>
                </div>

                <div className="bg-white/[0.07] backdrop-blur-3xl border border-white/[0.18] rounded-3xl p-8">
                    {remainingMinutes ? (
                        <div className="text-center">
                            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
                                <p className="text-red-300 text-sm">⚠️ Trop de tentatives</p>
                                <p className="text-white/80 text-xs mt-1">Veuillez patienter {remainingMinutes} minute(s) avant de réessayer.</p>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-white/10 text-white/80 py-2.5 rounded-lg text-sm hover:bg-white/20 transition-colors"
                            >
                                Réessayer plus tard
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Nom d'utilisateur"
                                    className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Mot de passe"
                                    className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm pr-10 focus:outline-none focus:border-indigo-400"
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
                                <Link href="/forgot-credentials" className="text-xs text-blue-300/70 hover:text-blue-200">
                                    Nom d'utilisateur ou mot de passe oublié ?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-white text-[#1a3a8f] py-2.5 rounded-lg text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Connexion...' : 'Se connecter'}
                            </button>
                        </form>
                    )}

                    <p className="text-center text-xs text-blue-200/50 mt-6">
                        Pas encore inscrit ?{' '}
                        <Link href="/register" className="text-white hover:underline font-semibold">
                            Créer un compte
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
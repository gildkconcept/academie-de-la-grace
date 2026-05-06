'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

function ResetAccountForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const oldUsername = searchParams.get('username') || ''

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' })

  useEffect(() => {
    if (!token) { toast.error('Lien invalide ou expiré'); router.push('/forgot-credentials') }
  }, [token])

  useEffect(() => {
    if (newUsername.length < 3) { setUsernameStatus('idle'); setSuggestions([]); return }
    const timeout = setTimeout(async () => {
      setUsernameStatus('checking')
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(newUsername)}`)
        const data = await res.json()
        if (data.available) { setUsernameStatus('available'); setSuggestions([]) }
        else { setUsernameStatus('taken'); setSuggestions(data.suggestions || []) }
      } catch (error) { setUsernameStatus('idle') }
    }, 500)
    return () => clearTimeout(timeout)
  }, [newUsername])

  const applySuggestion = (suggestion: string) => { setNewUsername(suggestion); setUsernameStatus('checking') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUsername || newUsername.length < 3) { toast.error('Nom d\'utilisateur invalide'); return }
    if (usernameStatus === 'taken') { toast.error('Ce nom d\'utilisateur est déjà utilisé'); return }
    if (!passwordData.password || passwordData.password.length < 6) { toast.error('Mot de passe trop court (min 6 caractères)'); return }
    if (passwordData.password !== passwordData.confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recoveryToken: token, newUsername, newPassword: passwordData.password })
      })
      const data = await res.json()
      if (res.ok) { setSuccess(true); toast.success('Compte réinitialisé avec succès !') }
      else {
        if (data.usernameTaken && data.suggestions) { setSuggestions(data.suggestions); toast.error(data.error) }
        else { toast.error(data.error || 'Erreur lors de la réinitialisation') }
      }
    } catch (error) { toast.error('Erreur de connexion') }
    finally { setLoading(false) }
  }

  if (success) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ fontFamily: "'Crimson Text', Georgia, serif", color: 'white' }}>
        <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
        <div className="fixed inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.88) 0%, rgba(15,45,130,0.82) 40%, rgba(10,30,100,0.87) 70%, rgba(4,12,65,0.92) 100%)' }} />
        <div className="relative z-30 w-full max-w-md px-4">
          <div className="bg-white/[0.07] backdrop-blur-3xl border border-white/[0.18] rounded-3xl p-8 text-center shadow-[0_32px_64px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-normal text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>Compte réinitialisé !</h2>
            <p className="text-blue-200/70 text-sm mb-4">Votre nom d'utilisateur et mot de passe ont été mis à jour.</p>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-6">
              <p className="text-green-300 text-sm"><strong>Nouveau nom d'utilisateur :</strong> {newUsername}</p>
            </div>
            <Link href="/login" className="inline-block bg-white text-[#1a3a8f] px-6 py-3 rounded-lg text-sm font-bold hover:shadow-lg transition-all" style={{ fontFamily: "'Crimson Text', serif" }}>
              Aller à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-12" style={{ fontFamily: "'Crimson Text', Georgia, serif", color: 'white' }}>
      <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
      <div className="fixed inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.88) 0%, rgba(15,45,130,0.82) 40%, rgba(10,30,100,0.87) 70%, rgba(4,12,65,0.92) 100%)' }} />
      <div className="fixed w-[250px] h-[250px] rounded-full bg-blue-400/20 blur-[80px] -top-[30px] -right-[30px] z-20 pointer-events-none" />

      <div className="relative z-30 w-full max-w-md px-4">
        <div className="bg-white/[0.07] backdrop-blur-3xl border border-white/[0.18] rounded-3xl p-8 shadow-[0_32px_64px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]">
          <h2 className="text-2xl font-normal text-white text-center mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            Réinitialisation du compte
          </h2>
          <p className="text-blue-200/70 text-xs text-center mb-1">Choisissez un nouveau nom d'utilisateur et mot de passe</p>
          {oldUsername && <p className="text-blue-200/50 text-xs text-center mb-4">Ancien nom d'utilisateur : <span className="font-mono">{oldUsername}</span></p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Nouveau nom d'utilisateur *" autoFocus
                className={`w-full px-4 py-2.5 bg-white/90 border rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none ${usernameStatus === 'available' ? 'border-green-400' : usernameStatus === 'taken' ? 'border-red-400' : 'border-white/30'}`} />
              {usernameStatus === 'checking' && <p className="text-xs text-white/50 mt-1">Vérification...</p>}
              {usernameStatus === 'available' && <p className="text-xs text-green-300 mt-1">✅ Disponible</p>}
              {usernameStatus === 'taken' && <p className="text-xs text-red-300 mt-1">❌ Déjà utilisé</p>}
              {suggestions.length > 0 && (
                <div className="mt-1">
                  <p className="text-xs text-white/50">Suggestions :</p>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {suggestions.map(sug => <button key={sug} type="button" onClick={() => applySuggestion(sug)} className="px-2 py-1 bg-white/10 rounded-md text-xs text-white/80 hover:bg-white/20">{sug}</button>)}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={passwordData.password} onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })} placeholder="Nouveau mot de passe (min 6) *"
                className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm pr-10 focus:outline-none focus:border-indigo-400" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} placeholder="Confirmer le mot de passe *"
                className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm pr-10 focus:outline-none focus:border-indigo-400" />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {showConfirm ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>

            {passwordData.password && passwordData.confirmPassword && (
              <p className={`text-xs ${passwordData.password === passwordData.confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                {passwordData.password === passwordData.confirmPassword ? '✅ Les mots de passe correspondent' : '❌ Les mots de passe ne correspondent pas'}
              </p>
            )}

            <button type="submit" disabled={loading || usernameStatus === 'checking'}
              className="w-full bg-white text-[#1a3a8f] py-2.5 rounded-lg text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
              style={{ fontFamily: "'Crimson Text', serif" }}>
              {loading ? 'Réinitialisation...' : 'Réinitialiser mon compte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetAccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a1a5a 0%, #0f2d82 50%, #0a1e64 100%)' }}><div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}>
      <ResetAccountForm />
    </Suspense>
  )
}
// app/reset-account/page.tsx
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
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (!token) {
      toast.error('Lien invalide ou expiré')
      router.push('/forgot-credentials')
    }
  }, [token])

  // Vérifier disponibilité du username en temps réel
  useEffect(() => {
    if (newUsername.length < 3) {
      setUsernameStatus('idle')
      setSuggestions([])
      return
    }

    const timeout = setTimeout(async () => {
      setUsernameStatus('checking')
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(newUsername)}`)
        const data = await res.json()
        if (data.available) {
          setUsernameStatus('available')
          setSuggestions([])
        } else {
          setUsernameStatus('taken')
          setSuggestions(data.suggestions || [])
        }
      } catch (error) {
        setUsernameStatus('idle')
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [newUsername])

  const applySuggestion = (suggestion: string) => {
    setNewUsername(suggestion)
    setUsernameStatus('checking')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newUsername || newUsername.length < 3) {
      toast.error('Nom d\'utilisateur invalide')
      return
    }

    if (usernameStatus === 'taken') {
      toast.error('Ce nom d\'utilisateur est déjà utilisé')
      return
    }

    if (!passwordData.password || passwordData.password.length < 6) {
      toast.error('Mot de passe trop court (min 6 caractères)')
      return
    }

    if (passwordData.password !== passwordData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recoveryToken: token,
          newUsername,
          newPassword: passwordData.password
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        toast.success('Compte réinitialisé avec succès !')
      } else {
        if (data.usernameTaken && data.suggestions) {
          setSuggestions(data.suggestions)
          toast.error(data.error)
        } else {
          toast.error(data.error || 'Erreur lors de la réinitialisation')
        }
      }
    } catch (error) {
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="text-6xl">✅</div>
          <h2 className="text-2xl font-bold text-gray-900">Compte réinitialisé !</h2>
          <p className="text-gray-600">
            Votre nom d'utilisateur et mot de passe ont été mis à jour.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>Nouveau nom d'utilisateur :</strong> {newUsername}
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Aller à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Réinitialisation du compte
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choisissez un nouveau nom d'utilisateur et mot de passe
          </p>
          {oldUsername && (
            <p className="mt-2 text-center text-xs text-gray-500">
              Ancien nom d'utilisateur : <span className="font-mono">{oldUsername}</span>
            </p>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Nouveau username */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nouveau nom d'utilisateur <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Choisissez un nom d'utilisateur"
                className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 ${
                  usernameStatus === 'available' ? 'border-green-500' :
                  usernameStatus === 'taken' ? 'border-red-500' : 'border-gray-300'
                }`}
                autoFocus
              />
              {usernameStatus === 'checking' && (
                <p className="mt-1 text-sm text-gray-500">Vérification...</p>
              )}
              {usernameStatus === 'available' && (
                <p className="mt-1 text-sm text-green-600">✅ Disponible</p>
              )}
              {usernameStatus === 'taken' && (
                <p className="mt-1 text-sm text-red-600">❌ Déjà utilisé</p>
              )}
              {suggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500">Suggestions :</p>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {suggestions.map(sug => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => applySuggestion(sug)}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-xs"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Nouveau mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nouveau mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.password}
                  onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                  placeholder="Minimum 6 caractères"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirmation mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirmer le mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Retapez le mot de passe"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              {passwordData.password && passwordData.confirmPassword && (
                <p className={`mt-1 text-sm ${passwordData.password === passwordData.confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordData.password === passwordData.confirmPassword ? '✅ Les mots de passe correspondent' : '❌ Les mots de passe ne correspondent pas'}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || usernameStatus === 'checking'}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Réinitialisation...' : 'Réinitialiser mon compte'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Wrapper avec Suspense pour useSearchParams
export default function ResetAccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ResetAccountForm />
    </Suspense>
  )
}
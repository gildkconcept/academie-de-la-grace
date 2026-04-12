'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Service } from '@/types'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

const branchesList = [
  'Katartizo',
  'Anagkazo',
  'Prodige',
  'Loyauté',
  'Faveur Divine',
  'Dunamis',
  'Zoé',
  'Odiéné',
  'Paris'
]

export default function RegisterPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [generatedUsername, setGeneratedUsername] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const router = useRouter()

  const [formData, setFormData] = useState({
    fullName: '',
    branch: '',
    level: '1',
    serviceId: '',
    baptized: 'false',
    phone: '',
    username: '',
    password: ''
  })

  useEffect(() => {
    fetchServices()
  }, [])

  // Vérification du username en temps réel avec debounce
  useEffect(() => {
    if (formData.username.length < 3) {
      setUsernameStatus('idle')
      setSuggestions([])
      return
    }

    const timeout = setTimeout(async () => {
      setUsernameStatus('checking')
      
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(formData.username)}`)
        const data = await res.json()
        
        if (data.available) {
          setUsernameStatus('available')
          setSuggestions([])
        } else {
          setUsernameStatus('taken')
          setSuggestions(data.suggestions || [])
        }
      } catch (error) {
        console.error('Erreur vérification username:', error)
        setUsernameStatus('idle')
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [formData.username])

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .order('name')
    
    if (data) {
      setServices(data)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Nom d\'utilisateur copié !')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Vérification supplémentaire avant soumission
    if (usernameStatus === 'taken') {
      toast.error('Ce nom d\'utilisateur n\'est pas disponible')
      return
    }
    
    if (formData.username.length < 3) {
      toast.error('Le nom d\'utilisateur doit contenir au moins 3 caractères')
      return
    }
    
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          branch: formData.branch,
          level: formData.level,
          serviceId: formData.serviceId,
          baptized: formData.baptized === 'true',
          phone: formData.phone,
          username: formData.username,
          password: formData.password
        })
      })

      const data = await res.json()

      if (res.ok) {
        setGeneratedUsername(data.username || formData.username)
        toast.success('Compte créé avec succès !')
      } else {
        toast.error(data.error || 'Erreur lors de l\'inscription')
      }
    } catch (error) {
      toast.error('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const applySuggestion = (suggestion: string) => {
    setFormData({ ...formData, username: suggestion })
    setUsernameStatus('checking')
  }

  // Si un username a été généré, afficher le message de succès
  if (generatedUsername) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              ✅ Compte créé avec succès !
            </h2>
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-sm text-gray-600 text-center mb-2">
                Votre nom d'utilisateur :
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-xl font-mono font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg">
                  {generatedUsername}
                </code>
                <button
                  onClick={() => copyToClipboard(generatedUsername)}
                  className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                  title="Copier"
                >
                  📋
                </button>
              </div>
              <p className="text-xs text-amber-600 text-center mt-4">
                ⚠️ Conservez précieusement ce nom d'utilisateur pour vous connecter.
              </p>
            </div>
            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Aller à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Inscription Étudiant
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Rejoignez l'Académie de la Grâce
          </p>
          <p className="mt-2 text-center text-xs text-gray-500 bg-blue-50 p-2 rounded">
            🔑 Choisissez un nom d'utilisateur unique (minimum 3 caractères)
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Nom et prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Gildas koudou"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-gray-700">
                Branche de l'église <span className="text-red-500">*</span>
              </label>
              <select
                name="branch"
                required
                value={formData.branch}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Sélectionnez une branche</option>
                {branchesList.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="level" className="block text-sm font-medium text-gray-700">
                Niveau <span className="text-red-500">*</span>
              </label>
              <select
                name="level"
                required
                value={formData.level}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="1">Niveau 1</option>
                <option value="2">Niveau 2</option>
                <option value="3">Niveau 3</option>
              </select>
            </div>

            <div>
              <label htmlFor="serviceId" className="block text-sm font-medium text-gray-700">
                Service <span className="text-red-500">*</span>
              </label>
              <select
                name="serviceId"
                required
                value={formData.serviceId}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Sélectionnez un service</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="baptized" className="block text-sm font-medium text-gray-700">
                Baptême
              </label>
              <select
                name="baptized"
                required
                value={formData.baptized}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="false">Non</option>
                <option value="true">Oui</option>
              </select>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Téléphone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="0700000000"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Nom d'utilisateur <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                required
                minLength={3}
                value={formData.username}
                onChange={handleChange}
                className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                  usernameStatus === 'available' ? 'border-green-500' :
                  usernameStatus === 'taken' ? 'border-red-500' :
                  'border-gray-300'
                }`}
                placeholder="ex: gildas.koudou"
              />
              
              {/* Statut de disponibilité */}
              {usernameStatus === 'checking' && (
                <p className="mt-1 text-sm text-gray-500">⏳ Vérification en cours...</p>
              )}
              {usernameStatus === 'available' && (
                <p className="mt-1 text-sm text-green-600">✅ Disponible</p>
              )}
              {usernameStatus === 'taken' && (
                <p className="mt-1 text-sm text-red-600">❌ Déjà utilisé</p>
              )}

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">Suggestions :</p>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => applySuggestion(sug)}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                  placeholder="Minimum 6 caractères"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || usernameStatus === 'checking'}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Inscription...' : "S'inscrire"}
            </button>
          </div>

          <div className="text-center">
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Déjà inscrit ? Se connecter
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
// app/forgot-credentials/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface Service {
  id: string
  name: string
}

export default function ForgotCredentialsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  
  const [formData, setFormData] = useState({
    phone: '',
    fullName: '',
    branch: '',
    serviceId: ''
  })

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

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('id, name').order('name')
    if (data) setServices(data)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.phone || !formData.fullName || !formData.branch || !formData.serviceId) {
      toast.error('Tous les champs sont obligatoires')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Identité vérifiée !')
        // Rediriger vers la page de réinitialisation avec le token
        router.push(`/reset-account?token=${encodeURIComponent(data.recoveryToken)}&username=${encodeURIComponent(data.student.username)}`)
      } else {
        toast.error(data.error || 'Vérification échouée')
      }
    } catch (error) {
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link href="/login" className="text-sm text-indigo-600 hover:text-indigo-500 mb-4 inline-block">
            ← Retour à la connexion
          </Link>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Récupération de compte
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Vérifiez votre identité pour réinitialiser vos identifiants
          </p>
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Toutes les informations doivent correspondre exactement à celles de votre inscription.
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Téléphone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Numéro de téléphone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="0700000000"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
            </div>

            {/* Nom complet */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Nom complet <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Ex: Jean Dupont"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
            </div>

            {/* Branche */}
            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-gray-700">
                Branche <span className="text-red-500">*</span>
              </label>
              <select
                name="branch"
                required
                value={formData.branch}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              >
                <option value="">Sélectionnez une branche</option>
                {branchesList.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>

            {/* Service */}
            <div>
              <label htmlFor="serviceId" className="block text-sm font-medium text-gray-700">
                Service <span className="text-red-500">*</span>
              </label>
              <select
                name="serviceId"
                required
                value={formData.serviceId}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              >
                <option value="">Sélectionnez un service</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Vérification...' : 'Vérifier mon identité'}
          </button>
        </form>
      </div>
    </div>
  )
}
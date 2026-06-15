'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { serviceService } from '@/services/serviceService'  // ← Remplacer supabase

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
    'Katartizo', 'Anagkazo', 'Prodige', 'Loyauté',
    'Faveur Divine', 'Dunamis', 'Zoé', 'Odiéné', 'Paris'
  ]

  useEffect(() => { fetchServices() }, [])

  const fetchServices = async () => {
    try {
      const data = await serviceService.getAll()  // ← Remplacé
      setServices(data || [])
    } catch (error) {
      console.error('Erreur chargement services:', error)
    }
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
        credentials: 'include',
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Identité vérifiée !')
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-12" style={{ fontFamily: "'Crimson Text', Georgia, serif", color: 'white' }}>
      <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
      <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.88) 0%, rgba(15,45,130,0.82) 40%, rgba(10,30,100,0.87) 70%, rgba(4,12,65,0.92) 100%)' }} />
      <div className="absolute w-[250px] h-[250px] rounded-full bg-blue-400/20 blur-[80px] -top-[30px] -right-[30px] z-20 pointer-events-none" />

      <div className="relative z-30 w-full max-w-md px-4">
        <div className="text-center mb-6">
          <Link href="/login" className="text-xs text-blue-200/60 hover:text-white mb-4 inline-block">← Retour à la connexion</Link>
        </div>

        <div className="bg-white/[0.07] backdrop-blur-3xl border border-white/[0.18] rounded-3xl p-8 shadow-[0_32px_64px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]">
          <h2 className="text-2xl font-normal text-white text-center mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            Récupération de compte
          </h2>
          <p className="text-blue-200/70 text-xs text-center mb-4">
            Vérifiez votre identité pour réinitialiser vos identifiants
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6">
            <p className="text-amber-300/80 text-xs">
              ⚠️ Toutes les informations doivent correspondre exactement à celles de votre inscription.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} placeholder="Numéro de téléphone"
              className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-400 text-sm" />
            <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Nom complet"
              className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-400 text-sm" />
            <select name="branch" required value={formData.branch} onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900">
              <option value="">Sélectionnez une branche</option>
              {branchesList.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select name="serviceId" required value={formData.serviceId} onChange={handleChange}
              className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900">
              <option value="">Sélectionnez un service</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <button type="submit" disabled={loading}
              className="w-full bg-white text-[#1a3a8f] py-2.5 rounded-lg text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
              style={{ fontFamily: "'Crimson Text', serif" }}>
              {loading ? 'Vérification...' : 'Vérifier mon identité'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
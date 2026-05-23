'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'

interface CreateNoPhoneStudentProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const CreateNoPhoneStudent = ({ isOpen, onClose, onSuccess }: CreateNoPhoneStudentProps) => {
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<any[]>([])
  const [formData, setFormData] = useState({
    fullName: '',
    branch: '',
    level: '1',
    serviceId: '',
    baptized: 'false',
    maisonGrace: '',
    profileImageUrl: ''
  })

  const branches = [
    'Katartizo', 'Anagkazo', 'Prodige', 'Loyauté',
    'Faveur Divine', 'Dunamis', 'Zoé', 'Odiéné', 'Paris'
  ]

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('id, name').order('name')
    if (data) setServices(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fullName || !formData.branch || !formData.serviceId) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/students/create-no-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Étudiant sans téléphone créé avec succès')
        onSuccess()
        onClose()
        setFormData({
          fullName: '',
          branch: '',
          level: '1',
          serviceId: '',
          baptized: 'false',
          maisonGrace: '',
          profileImageUrl: ''
        })
      } else {
        toast.error(data.error || 'Erreur lors de la création')
      }
    } catch (error) {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const inputClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
  const selectClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md relative rounded-2xl max-h-[90vh] overflow-y-auto" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
        <div className="absolute inset-0 bg-cover bg-center rounded-2xl" style={{ backgroundImage: "url('/ok.png')" }} />
        <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.97) 0%, rgba(15,45,130,0.95) 40%, rgba(10,30,100,0.96) 70%, rgba(4,12,65,0.98) 100%)' }} />
        
        <div className="relative z-10 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              <UserPlusIcon className="w-5 h-5 text-blue-300" />
              Étudiant sans téléphone
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
              <XMarkIcon className="w-5 h-5 text-white/60" />
            </button>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
            <p className="text-amber-300/80 text-xs flex items-center gap-2">
              📵 Cet étudiant n'a pas de téléphone. Les présences seront marquées manuellement par le Super Admin.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Nom complet *</label>
              <input type="text" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className={inputClass} required />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Branche *</label>
              <select value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} className={selectClass} required>
                <option value="">Sélectionnez une branche</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Niveau</label>
              <select value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })} className={selectClass}>
                <option value="1">Niveau 1</option>
                <option value="2">Niveau 2</option>
                <option value="3">Niveau 3</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Service *</label>
              <select value={formData.serviceId} onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })} className={selectClass} required>
                <option value="">Sélectionnez un service</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Baptême</label>
              <select value={formData.baptized} onChange={(e) => setFormData({ ...formData, baptized: e.target.value })} className={selectClass}>
                <option value="false">Non baptisé</option>
                <option value="true">Baptisé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1">Maison de grâce (optionnel)</label>
              <input type="text" value={formData.maisonGrace} onChange={(e) => setFormData({ ...formData, maisonGrace: e.target.value })} className={inputClass} />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors">Annuler</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50">
                {loading ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
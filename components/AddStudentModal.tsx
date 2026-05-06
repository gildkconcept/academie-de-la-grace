// components/AddStudentModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface AddStudentModalProps {
  isOpen: boolean
  onClose: () => void
  serviceId: string
  onStudentAdded: () => void
}

export const AddStudentModal = ({ isOpen, onClose, serviceId, onStudentAdded }: AddStudentModalProps) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    branch: '',
    level: '1',
    baptized: 'false',
    phone: '',
    password: ''
  })

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen) return null

  const handleClose = () => {
    setFormData({ fullName: '', username: '', branch: '', level: '1', baptized: 'false', phone: '', password: '' })
    onClose()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''
    for (let i = 0; i < 8; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))
    setFormData({ ...formData, password })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/students/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ ...formData, serviceId })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Étudiant ajouté avec succès')
        onStudentAdded()
        handleClose()
      } else {
        toast.error(data.error || 'Erreur lors de la création')
      }
    } catch (error) { toast.error('Erreur lors de la création') }
    finally { setLoading(false) }
  }

  const inputClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
  const selectClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative rounded-2xl" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
        {/* Fond glass */}
        <div className="absolute inset-0 bg-cover bg-center rounded-2xl" style={{ backgroundImage: "url('/ok.png')" }} />
        <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.96) 0%, rgba(15,45,130,0.94) 40%, rgba(10,30,100,0.95) 70%, rgba(4,12,65,0.97) 100%)' }} />
        
        {/* Contenu */}
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              Ajouter un étudiant
            </h2>
            <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <XMarkIcon className="w-5 h-5 text-white/60" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Nom et prénom <span className="text-red-400">*</span></label>
                <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Nom et prénom" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Nom d'utilisateur <span className="text-red-400">*</span></label>
                <input type="text" name="username" required value={formData.username} onChange={handleChange} placeholder="Nom d'utilisateur" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Branche <span className="text-red-400">*</span></label>
                <input type="text" name="branch" required value={formData.branch} onChange={handleChange} placeholder="Branche" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Niveau <span className="text-red-400">*</span></label>
                <select name="level" required value={formData.level} onChange={handleChange} className={selectClass}>
                  <option value="1">Niveau 1</option>
                  <option value="2">Niveau 2</option>
                  <option value="3">Niveau 3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Baptême</label>
                <select name="baptized" value={formData.baptized} onChange={handleChange} className={selectClass}>
                  <option value="false">Non</option>
                  <option value="true">Oui</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Téléphone (optionnel)</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Laissez vide si pas de téléphone" className={inputClass} />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="border-t border-white/[0.08] pt-4">
              <label className="block text-sm text-white/70 mb-1">Mot de passe <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                <input type="text" name="password" required value={formData.password} onChange={handleChange} placeholder="Mot de passe" className={`${inputClass} flex-1`} />
                <button type="button" onClick={generatePassword} className="px-4 py-2.5 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors whitespace-nowrap">
                  Générer
                </button>
              </div>
              <p className="text-xs text-white/40 mt-1">Le mot de passe doit contenir au moins 6 caractères</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button type="button" onClick={handleClose} className="px-4 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={loading} className="px-6 py-2 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50" style={{ fontFamily: "'Crimson Text', serif" }}>
                {loading ? 'Création...' : "Ajouter l'étudiant"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
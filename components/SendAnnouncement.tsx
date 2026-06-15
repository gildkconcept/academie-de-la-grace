'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { XMarkIcon, MegaphoneIcon } from '@heroicons/react/24/outline'
import axiosInstance from '@/lib/axios'

interface SendAnnouncementProps {
  onClose: () => void
}

export const SendAnnouncement = ({ onClose }: SendAnnouncementProps) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ title: '', message: '', target: 'all' })
  const [services, setServices] = useState<any[]>([])
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedLevel, setSelectedLevel] = useState<string>('1')
  const [loadingServices, setLoadingServices] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    setLoadingServices(true)
    try {
      const response = await axiosInstance.get('/services')
      const data = response.data
      if (Array.isArray(data)) setServices(data)
    } catch (error) { 
      console.error('Erreur chargement services:', error)
      toast.error('Erreur lors du chargement des services')
    } finally { 
      setLoadingServices(false) 
    }
  }

  const handleSend = async () => {
    if (!formData.title || !formData.message) { 
      toast.error('Le titre et le message sont requis')
      return 
    }
    
    setLoading(true)
    try {
      let userIds: string[] = []
      let targetLabel = ''
      
      if (formData.target === 'all') {
        const response = await axiosInstance.get('/students/all-ids')
        userIds = response.data.studentIds || []
        targetLabel = 'tous les étudiants'
      } else if (formData.target === 'service') {
        if (!selectedService) { 
          toast.error('Veuillez sélectionner un service')
          setLoading(false)
          return 
        }
        const response = await axiosInstance.get(`/students/by-service?serviceId=${selectedService}`)
        userIds = response.data.studentIds || []
        targetLabel = `le service ${services.find(s => s.id === selectedService)?.name || ''}`
      } else if (formData.target === 'level') {
        const response = await axiosInstance.get(`/students/by-level?level=${selectedLevel}`)
        userIds = response.data.studentIds || []
        targetLabel = `les étudiants du niveau ${selectedLevel}`
      }
      
      if (userIds.length === 0) { 
        toast.error('Aucun étudiant trouvé')
        setLoading(false)
        return 
      }

      const response = await axiosInstance.post('/notifications', {
        userIds,
        title: `📢 ${formData.title}`,
        message: formData.message,
        type: 'announcement',
        link: '/dashboard/student'
      })
      
      toast.success(`Annonce envoyée à ${userIds.length} étudiant(s) de ${targetLabel} !`)
      onClose()
    } catch (error: any) {
      console.error('Erreur:', error)
      const errorMsg = error.response?.data?.error || error.message || 'Erreur lors de l\'envoi'
      toast.error(errorMsg)
    } finally { 
      setLoading(false) 
    }
  }

  const inputClass = "w-full p-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
  const selectClass = "w-full p-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg relative rounded-2xl" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
        <div className="absolute inset-0 bg-cover bg-center rounded-2xl" style={{ backgroundImage: "url('/ok.png')" }} />
        <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.97) 0%, rgba(15,45,130,0.95) 40%, rgba(10,30,100,0.96) 70%, rgba(4,12,65,0.98) 100%)' }} />
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              <MegaphoneIcon className="w-5 h-5 text-blue-300" /> Nouvelle annonce
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <XMarkIcon className="w-5 h-5 text-white/60" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Titre <span className="text-red-400">*</span></label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Rappel important" className={inputClass} maxLength={200} />
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Message <span className="text-red-400">*</span></label>
              <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Votre message..." className={inputClass} rows={4} maxLength={1000} />
              <p className="text-xs text-white/30 mt-1">{formData.message.length}/1000</p>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Destinataires</label>
              <select value={formData.target} onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                className={selectClass}>
                <option value="all">Tous les étudiants</option>
                <option value="service">Un service spécifique</option>
                <option value="level">Par niveau</option>
              </select>
            </div>
            {formData.target === 'service' && (
              <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className={selectClass} disabled={loadingServices}>
                <option value="">Sélectionnez un service</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {formData.target === 'level' && (
              <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className={selectClass}>
                <option value="1">Niveau 1</option>
                <option value="2">Niveau 2</option>
                <option value="3">Niveau 3</option>
              </select>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
              <button onClick={onClose} className="px-4 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors">Annuler</button>
              <button onClick={handleSend} disabled={loading}
                className="px-6 py-2 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50" style={{ fontFamily: "'Crimson Text', serif" }}>
                {loading ? 'Envoi...' : "Envoyer l'annonce"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
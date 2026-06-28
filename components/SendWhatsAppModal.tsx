// components/SendWhatsAppModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { XMarkIcon, PaperAirplaneIcon, UserGroupIcon, PhoneIcon } from '@heroicons/react/24/outline'
import { whatsappService } from '@/services/whatsappService'
import { serviceService } from '@/services/serviceService'

interface SendWhatsAppModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SendWhatsAppModal = ({ isOpen, onClose }: SendWhatsAppModalProps) => {
  const [loading, setLoading] = useState(false)
  const [loadingPhones, setLoadingPhones] = useState(false)
  const [services, setServices] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  
  const [formData, setFormData] = useState({
    message: '',
    target: 'all', // 'all' | 'service' | 'level' | 'selected'
    serviceId: 'all',
    level: 'all',
    branch: 'all'
  })

  const [preview, setPreview] = useState<{
    total: number
    withPhone: number
    withoutPhone: number
    sampleLinks: string[]
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchServices()
      fetchStudents()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      fetchStudents()
    }
  }, [formData.target, formData.serviceId, formData.level, formData.branch])

  const fetchServices = async () => {
    try {
      const data = await serviceService.getAll()
      setServices(data || [])
    } catch (error) {
      console.error('Erreur chargement services:', error)
    }
  }

  const fetchStudents = async () => {
    setLoadingPhones(true)
    try {
      const filters: any = {}
      if (formData.serviceId && formData.serviceId !== 'all') {
        filters.serviceId = formData.serviceId
      }
      if (formData.level && formData.level !== 'all') {
        filters.level = formData.level
      }
      if (formData.branch && formData.branch !== 'all') {
        filters.branch = formData.branch
      }
      
      const data = await whatsappService.getStudentPhones(filters)
      setStudents(data.students || [])
      
      // Mettre à jour le preview
      const total = data.students?.length || 0
      const withPhone = data.students?.filter((s: any) => s.phone).length || 0
      setPreview({
        total,
        withPhone,
        withoutPhone: total - withPhone,
        sampleLinks: []
      })
    } catch (error) {
      console.error('Erreur chargement étudiants:', error)
      toast.error('Erreur lors du chargement des étudiants')
    } finally {
      setLoadingPhones(false)
    }
  }

  const handleSend = async () => {
    if (!formData.message.trim()) {
      toast.error('Veuillez saisir un message')
      return
    }

    if (formData.message.length < 10) {
      toast.error('Le message doit contenir au moins 10 caractères')
      return
    }

    setLoading(true)
    try {
      // Déterminer les destinataires
      let recipients: string[] = []
      let includeAll = false
      let serviceId = undefined
      let level = undefined

      if (formData.target === 'all') {
        includeAll = true
      } else if (formData.target === 'service' && formData.serviceId !== 'all') {
        includeAll = true
        serviceId = formData.serviceId
      } else if (formData.target === 'level' && formData.level !== 'all') {
        includeAll = true
        level = parseInt(formData.level)
      } else if (formData.target === 'selected') {
        recipients = selectedStudents
      }

      const data = await whatsappService.sendMessage({
        message: formData.message,
        recipients,
        includeAll,
        serviceId,
        level
      })

      if (data.success) {
        setPreview({
          total: data.stats.totalStudents,
          withPhone: data.stats.withPhone,
          withoutPhone: data.stats.withoutPhone,
          sampleLinks: data.links.slice(0, 3)
        })

        // Ouvrir les liens WhatsApp dans de nouveaux onglets
        if (data.links.length > 0) {
          // Pour les envois groupés, on ouvre le premier lien
          // L'utilisateur peut ensuite utiliser le partage WhatsApp
          const link = data.links[0]
          window.open(link, '_blank')
          toast.success(`Message préparé pour ${data.stats.withPhone} étudiant(s) sur ${data.stats.totalStudents}`)
        }

        if (data.stats.withoutPhone > 0) {
          toast.warning(`${data.stats.withoutPhone} étudiant(s) n'ont pas de numéro de téléphone`)
        }
      }
    } catch (error: any) {
      console.error('Erreur envoi:', error)
      toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(students.map(s => s.id))
    }
    setSelectAll(!selectAll)
  }

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId)
      } else {
        return [...prev, studentId]
      }
    })
  }

  if (!isOpen) return null

  const inputClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
  const selectClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative rounded-2xl" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
        {/* Fond glass */}
        <div className="absolute inset-0 bg-cover bg-center rounded-2xl" style={{ backgroundImage: "url('/ok.png')" }} />
        <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.97) 0%, rgba(15,45,130,0.95) 40%, rgba(10,30,100,0.96) 70%, rgba(4,12,65,0.98) 100%)' }} />
        
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <PhoneIcon className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Envoyer un message WhatsApp
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <XMarkIcon className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Stats */}
          {preview && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white/[0.04] rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-white">{preview.total}</div>
                <div className="text-xs text-white/40">Étudiants</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-300">{preview.withPhone}</div>
                <div className="text-xs text-white/40">Avec téléphone</div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-red-300">{preview.withoutPhone}</div>
                <div className="text-xs text-white/40">Sans téléphone</div>
              </div>
            </div>
          )}

          {/* Formulaire */}
          <div className="space-y-4">
            {/* Destinataires */}
            <div>
              <label className="block text-sm text-white/70 mb-1">Destinataires</label>
              <select
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                className={selectClass}
              >
                <option value="all">Tous les étudiants</option>
                <option value="service">Par service</option>
                <option value="level">Par niveau</option>
                <option value="selected">Sélection manuelle</option>
              </select>
            </div>

            {/* Filtres */}
            {(formData.target === 'service' || formData.target === 'all') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Service</label>
                  <select
                    value={formData.serviceId}
                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                    className={selectClass}
                  >
                    <option value="all">Tous les services</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Niveau</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className={selectClass}
                  >
                    <option value="all">Tous les niveaux</option>
                    <option value="1">Niveau 1</option>
                    <option value="2">Niveau 2</option>
                    <option value="3">Niveau 3</option>
                  </select>
                </div>
              </div>
            )}

            {/* Sélection manuelle */}
            {formData.target === 'selected' && (
              <div className="bg-white/[0.04] rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-white/30 bg-white/10"
                  />
                  <span className="text-sm text-white/70">Sélectionner tout ({students.length})</span>
                </div>
                {students.map(student => (
                  <div key={student.id} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="w-4 h-4 rounded border-white/30 bg-white/10"
                      disabled={!student.phone}
                    />
                    <span className={`text-sm ${student.phone ? 'text-white/80' : 'text-white/30'}`}>
                      {student.full_name}
                      {!student.phone && ' (📵 sans téléphone)'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Message */}
            <div>
              <label className="block text-sm text-white/70 mb-1">Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Écrivez votre message ici..."
                className={`${inputClass} min-h-[120px] resize-y`}
                maxLength={2000}
              />
              <div className="flex justify-between text-xs text-white/30 mt-1">
                <span>{formData.message.length} / 2000 caractères</span>
                <span>💡 Le message sera envoyé via WhatsApp</span>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4 border-t border-white/[0.08]">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={loading || !formData.message.trim()}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-4 h-4" />
                    Envoyer via WhatsApp
                  </>
                )}
              </button>
            </div>

            {/* Avertissement */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-amber-300/70 text-xs flex items-start gap-2">
                <span className="text-amber-400">⚠️</span>
                <span>Chaque étudiant recevra un lien WhatsApp individuel. Ouvrez le premier lien pour envoyer le message, puis passez au suivant en fermant l'onglet.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
// components/SendWhatsAppModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { XMarkIcon, PaperAirplaneIcon, PhoneIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline'
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
  
  // ✅ NOUVEAU - États pour les liens
  const [allLinks, setAllLinks] = useState<string[]>([])
  const [currentLinkIndex, setCurrentLinkIndex] = useState(0)
  const [showLinks, setShowLinks] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  
  const [formData, setFormData] = useState({
    message: '',
    target: 'all',
    serviceId: 'all',
    level: 'all',
    branch: 'all'
  })

  const [preview, setPreview] = useState<{
    total: number
    withPhone: number
    withoutPhone: number
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchServices()
      fetchStudents()
      // Réinitialiser les liens quand on ferme/ouvre
      setAllLinks([])
      setShowLinks(false)
      setCurrentLinkIndex(0)
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
      
      const total = data.students?.length || 0
      const withPhone = data.students?.filter((s: any) => s.phone).length || 0
      setPreview({
        total,
        withPhone,
        withoutPhone: total - withPhone
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
          withoutPhone: data.stats.withoutPhone
        })

        // ✅ STOCKER TOUS LES LIENS
        setAllLinks(data.links || [])
        setCurrentLinkIndex(0)
        setShowLinks(true)

        if (data.stats.withPhone > 0) {
          toast.success(`${data.stats.withPhone} lien(s) WhatsApp générés !`)
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

  // ✅ Ouvrir le lien actuel
  const openCurrentLink = () => {
    if (allLinks.length > 0 && currentLinkIndex < allLinks.length) {
      window.open(allLinks[currentLinkIndex], '_blank')
    }
  }

  // ✅ Passer au lien suivant
  const nextLink = () => {
    if (currentLinkIndex < allLinks.length - 1) {
      setCurrentLinkIndex(currentLinkIndex + 1)
    } else {
      toast.success('✅ Tous les liens ont été parcourus !')
    }
  }

  // ✅ Passer au lien précédent
  const prevLink = () => {
    if (currentLinkIndex > 0) {
      setCurrentLinkIndex(currentLinkIndex - 1)
    }
  }

  // ✅ Copier le lien
  const copyLink = async (link: string, index: number) => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
      toast.success('Lien copié !')
    } catch (error) {
      toast.error('Erreur lors de la copie')
    }
  }

  // ✅ Ouvrir un lien spécifique
  const openSpecificLink = (link: string) => {
    window.open(link, '_blank')
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

  // ✅ Fermer et réinitialiser
  const handleClose = () => {
    setAllLinks([])
    setShowLinks(false)
    setCurrentLinkIndex(0)
    onClose()
  }

  if (!isOpen) return null

  const inputClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
  const selectClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

  // ✅ Si on affiche les liens
  if (showLinks && allLinks.length > 0) {
    const total = allLinks.length
    const current = currentLinkIndex + 1
    const progress = Math.round((current / total) * 100)

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative rounded-2xl" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
          <div className="absolute inset-0 bg-cover bg-center rounded-2xl" style={{ backgroundImage: "url('/ok.png')" }} />
          <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.97) 0%, rgba(15,45,130,0.95) 40%, rgba(10,30,100,0.96) 70%, rgba(4,12,65,0.98) 100%)' }} />
          
          <div className="relative z-10 p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  📱 Envoi WhatsApp
                </h2>
                <p className="text-white/50 text-sm">{current} / {total} étudiants</p>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <XMarkIcon className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Barre de progression */}
            <div className="w-full bg-white/10 rounded-full h-2 mb-4">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Lien actuel */}
            <div className="bg-white/[0.06] border border-white/[0.1] rounded-xl p-4 mb-4">
              <p className="text-white/60 text-xs mb-1">Étudiant {current}</p>
              <p className="text-white/80 text-sm truncate">{allLinks[currentLinkIndex]}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={openCurrentLink}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  📤 Ouvrir WhatsApp
                </button>
                <button
                  onClick={() => copyLink(allLinks[currentLinkIndex], currentLinkIndex)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-sm transition-colors"
                >
                  {copiedIndex === currentLinkIndex ? (
                    <CheckIcon className="w-4 h-4 text-green-400" />
                  ) : (
                    <ClipboardIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={prevLink}
                disabled={currentLinkIndex === 0}
                className="flex-1 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors disabled:opacity-30"
              >
                ← Précédent
              </button>
              <button
                onClick={nextLink}
                className="flex-1 py-2 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all"
              >
                {currentLinkIndex < allLinks.length - 1 ? 'Suivant →' : '✅ Terminé'}
              </button>
            </div>

            {/* Liste de tous les liens (scrollable) */}
            <div className="mt-4 max-h-40 overflow-y-auto bg-white/[0.04] rounded-lg p-3">
              <p className="text-white/40 text-xs mb-2">Tous les liens ({allLinks.length}) :</p>
              {allLinks.map((link, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-white/10 transition-colors ${
                    index === currentLinkIndex ? 'bg-green-500/20 border-l-2 border-green-400' : ''
                  }`}
                  onClick={() => openSpecificLink(link)}
                >
                  <span className={`text-xs ${index === currentLinkIndex ? 'text-white' : 'text-white/40'}`}>
                    {index + 1}.
                  </span>
                  <span className={`text-xs truncate flex-1 ${index === currentLinkIndex ? 'text-white/80' : 'text-white/40'}`}>
                    {link}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyLink(link, index); }}
                    className="text-white/30 hover:text-white/70"
                  >
                    {copiedIndex === index ? (
                      <CheckIcon className="w-3 h-3 text-green-400" />
                    ) : (
                      <ClipboardIcon className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-4 text-center text-white/40 text-xs">
              💡 Cliquez sur "Ouvrir WhatsApp" puis envoyez le message. 
              Revenez ensuite pour passer à l'étudiant suivant.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ✅ Formulaire de sélection des étudiants
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative rounded-2xl" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
        <div className="absolute inset-0 bg-cover bg-center rounded-2xl" style={{ backgroundImage: "url('/ok.png')" }} />
        <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.97) 0%, rgba(15,45,130,0.95) 40%, rgba(10,30,100,0.96) 70%, rgba(4,12,65,0.98) 100%)' }} />
        
        <div className="relative z-10 p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <PhoneIcon className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                Envoyer un message WhatsApp
              </h2>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <XMarkIcon className="w-5 h-5 text-white/60" />
            </button>
          </div>

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

          <div className="space-y-4">
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

            <div className="flex gap-3 pt-4 border-t border-white/[0.08]">
              <button
                onClick={handleClose}
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
                    Générer les liens WhatsApp
                  </>
                )}
              </button>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-amber-300/70 text-xs flex items-start gap-2">
                <span className="text-amber-400">ℹ️</span>
                <span>Les liens seront générés pour chaque étudiant. Vous pourrez ensuite les ouvrir un par un pour envoyer les messages.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
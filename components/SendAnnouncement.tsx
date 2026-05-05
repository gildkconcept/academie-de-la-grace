'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { XMarkIcon, MegaphoneIcon } from '@heroicons/react/24/outline'

interface SendAnnouncementProps {
  onClose: () => void
}

export const SendAnnouncement = ({ onClose }: SendAnnouncementProps) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target: 'all'
  })
  const [services, setServices] = useState<any[]>([])
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedLevel, setSelectedLevel] = useState<string>('1')
  const [loadingServices, setLoadingServices] = useState(false)

  const fetchServices = async () => {
    setLoadingServices(true)
    try {
      const res = await fetch('/api/services', { credentials: 'include' })
      const data = await res.json()
      if (Array.isArray(data)) setServices(data)
    } catch (error) {
      console.error('Erreur chargement services:', error)
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
        const res = await fetch('/api/students/all-ids', { credentials: 'include' })
        const data = await res.json()
        userIds = data.studentIds || []
        targetLabel = 'tous les étudiants'
      } else if (formData.target === 'service') {
        if (!selectedService) {
          toast.error('Veuillez sélectionner un service')
          setLoading(false)
          return
        }
        const res = await fetch(`/api/students/by-service?serviceId=${selectedService}`, { credentials: 'include' })
        const data = await res.json()
        userIds = data.studentIds || []
        const serviceName = services.find(s => s.id === selectedService)?.name || 'ce service'
        targetLabel = `le service ${serviceName}`
      } else if (formData.target === 'level') {
        const res = await fetch(`/api/students/by-level?level=${selectedLevel}`, { credentials: 'include' })
        const data = await res.json()
        userIds = data.studentIds || []
        targetLabel = `les étudiants de niveau ${selectedLevel}`
      }

      if (userIds.length === 0) {
        toast.error('Aucun étudiant trouvé')
        setLoading(false)
        return
      }

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userIds,
          title: `📢 ${formData.title}`,
          message: formData.message,
          type: 'announcement',
          link: '/dashboard/student'
        })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(`Annonce envoyée à ${userIds.length} étudiant(s) de ${targetLabel} !`)
        onClose()
      } else {
        toast.error(data.error || 'Erreur lors de l\'envoi')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MegaphoneIcon className="w-5 h-5 text-indigo-600" />
            Nouvelle annonce
          </CardTitle>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Rappel important"
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              maxLength={200}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Votre message..."
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-gray-400 mt-1">{formData.message.length}/1000</p>
          </div>

          {/* Cible */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destinataires
            </label>
            <select
              value={formData.target}
              onChange={(e) => {
                setFormData({ ...formData, target: e.target.value })
                if (e.target.value === 'service') fetchServices()
              }}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">Tous les étudiants</option>
              <option value="service">Un service spécifique</option>
              <option value="level">Par niveau</option>
            </select>
          </div>

          {/* Sélection du service */}
          {formData.target === 'service' && (
            <div>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                disabled={loadingServices}
              >
                <option value="">Sélectionnez un service</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sélection du niveau */}
          {formData.target === 'level' && (
            <div>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="1">Niveau 1</option>
                <option value="2">Niveau 2</option>
                <option value="3">Niveau 3</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSend} disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer l\'annonce'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
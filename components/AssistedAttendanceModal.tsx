// components/AssistedAttendanceModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { AssistedAttendance } from './AssistedAttendance'
import { attendanceService } from '@/services/attendanceService'
import axiosInstance from '@/lib/axios'

interface AssistedAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export const AssistedAttendanceModal = ({ isOpen, onClose, onComplete }: AssistedAttendanceModalProps) => {
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [showAttendance, setShowAttendance] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchSessions()
    }
  }, [isOpen])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      console.log('🔍 [Modal] Récupération de toutes les sessions...')
      
      // Utiliser axiosInstance pour récupérer toutes les sessions
      const response = await axiosInstance.get('/sessions/all-history?limit=50&offset=0')
      const data = response.data
      
      console.log('🔍 [Modal] Sessions reçues:', data.sessions?.length || 0)
      
      // Filtrer pour n'avoir que les sessions valides (avec un code)
      const validSessions = (data.sessions || []).filter((session: { code: string; date: string }) => {
        return session.code && session.date
      })
      
      console.log('🔍 [Modal] Sessions valides:', validSessions.length)
      
      // Trier par date décroissante (les plus récentes d'abord)
     validSessions.sort((a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      setSessions(validSessions)
      
      if (validSessions.length === 0) {
        console.log('⚠️ [Modal] Aucune session trouvée')
      } else {
        console.log('✅ [Modal] Sessions chargées:', validSessions.map((s: { code: string; date: string; level: number | null }) => ({ code: s.code, date: s.date, level: s.level })))
      }
    } catch (error) {
      console.error('❌ [Modal] Erreur chargement sessions:', error)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSession = () => {
    if (!selectedSessionId) return
    console.log('🔍 [Modal] Session sélectionnée:', selectedSessionId)
    setShowAttendance(true)
  }

  const handleBack = () => {
    setShowAttendance(false)
    setSelectedSessionId('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto relative rounded-2xl" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
        <div className="absolute inset-0 bg-cover bg-center rounded-2xl" style={{ backgroundImage: "url('/ok.png')" }} />
        <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.97) 0%, rgba(15,45,130,0.95) 40%, rgba(10,30,100,0.96) 70%, rgba(4,12,65,0.98) 100%)' }} />
        
        <div className="relative z-10 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              📵 Présence assistée
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
              <XMarkIcon className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {!showAttendance ? (
            <>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
                <p className="text-amber-300/80 text-xs flex items-center gap-2">
                  📌 Sélectionnez une session académique pour marquer les présences des étudiants sans téléphone.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Session académique</label>
                  {loading ? (
                    <div className="text-center py-4 text-white/50">
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                      Chargement des sessions...
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="text-center py-6 bg-white/[0.04] rounded-lg">
                      <p className="text-white/40 text-sm">Aucune session disponible</p>
                      <p className="text-white/30 text-xs mt-2">Générez d'abord un code dans le tableau superadmin</p>
                    </div>
                  ) : (
                    <select
                      value={selectedSessionId}
                      onChange={(e) => setSelectedSessionId(e.target.value)}
                      className="w-full p-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400"
                    >
                      <option value="">Sélectionnez une session</option>
                      {sessions.map((session: { id: string; code: string; date: string; level: number | null }) => (
                        <option key={session.id} value={session.id}>
                          {new Date(session.date).toLocaleDateString('fr-FR')} - Code: {session.code} {session.level ? `(Niv.${session.level})` : '(Universel)'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSelectSession}
                    disabled={!selectedSessionId || loading}
                    className="flex-1 py-2.5 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    Continuer
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={handleBack}
                className="mb-4 text-sm text-blue-300 hover:text-blue-200 flex items-center gap-1"
              >
                ← Retour à la sélection
              </button>
              <AssistedAttendance
                sessionId={selectedSessionId}
                onComplete={() => {
                  onComplete()
                  onClose()
                  setShowAttendance(false)
                  setSelectedSessionId('')
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
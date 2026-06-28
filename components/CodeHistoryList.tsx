// components/CodeHistoryList.tsx
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  DocumentArrowDownIcon,
  EyeIcon,
  XMarkIcon,
  CalendarIcon,
  UserGroupIcon,
  MapPinIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { sessionService } from '@/services/sessionService'
import { serviceService } from '@/services/serviceService'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import axiosInstance from '@/lib/axios'

interface CodeSession {
  id: string
  code: string
  date: string
  created_at: string
  expires_at: string
  level: number | null
  lat: number | null
  lng: number | null
  radius: number | null
  stats: {
    total: number
    present: number
    absent: number
    late: number
    rate: number
  }
  created_by?: string
}

export const CodeHistoryList = () => {
  const [sessions, setSessions] = useState<CodeSession[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedDate, setSelectedDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showDetail, setShowDetail] = useState<CodeSession | null>(null)
  const [detailStudents, setDetailStudents] = useState<any[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)
  const limit = 20

  useEffect(() => {
    fetchSessions()
  }, [page, selectedLevel, selectedDate])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const offset = page * limit
      const response = await sessionService.getSessionHistory(limit, offset)
      
      // Enrichir avec les stats
      const enriched = await Promise.all((response.sessions || []).map(async (session: any) => {
        const stats = await getSessionStats(session.id)
        return {
          ...session,
          stats
        }
      }))

      setSessions(enriched || [])
      setTotal(response.total || 0)
    } catch (error) {
      console.error('Erreur chargement historique des codes:', error)
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const getSessionStats = async (sessionId: string) => {
    try {
      const { data: attendances } = await axiosInstance.get(`/attendance/session/${sessionId}/stats`)
      return attendances || { total: 0, present: 0, absent: 0, late: 0, rate: 0 }
    } catch (error) {
      console.error('Erreur récupération stats:', error)
      return { total: 0, present: 0, absent: 0, late: 0, rate: 0 }
    }
  }

  const viewDetail = async (session: CodeSession) => {
    try {
      const response = await axiosInstance.get(`/attendance/session/${session.id}/students`)
      setDetailStudents(response.data || [])
      setShowDetail(session)
    } catch (error) {
      console.error('Erreur récupération détails:', error)
      toast.error('Erreur lors du chargement des détails')
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('⚠️ Voulez-vous vraiment supprimer cette session et toutes ses présences associées ? Cette action est irréversible.')) return
    
    setDeleting(sessionId)
    try {
      await axiosInstance.delete(`/sessions/${sessionId}`)
      toast.success('Session supprimée avec succès')
      fetchSessions()
    } catch (error: any) {
      console.error('Erreur suppression:', error)
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression')
    } finally {
      setDeleting(null)
    }
  }

  const exportPDF = async (session: CodeSession) => {
    try {
      const doc = new jsPDF()
      
      doc.setFontSize(20)
      doc.text('Académie de la Grâce', 105, 15, { align: 'center' })
      doc.setFontSize(16)
      doc.text('Rapport de présence par code', 105, 25, { align: 'center' })
      
      doc.setFontSize(12)
      doc.text(`Code: ${session.code}`, 105, 35, { align: 'center' })
      doc.text(`Date: ${new Date(session.date).toLocaleDateString('fr-FR')}`, 105, 42, { align: 'center' })
      doc.text(`Niveau: ${session.level ? `Niveau ${session.level}` : 'Universel'}`, 105, 49, { align: 'center' })
      
      doc.setFontSize(11)
      doc.text(`Présents: ${session.stats.present}`, 20, 62)
      doc.text(`Absents: ${session.stats.absent}`, 20, 69)
      doc.text(`Taux: ${session.stats.rate}%`, 20, 76)

      const response = await axiosInstance.get(`/attendance/session/${session.id}/students`)
      const students = response.data || []

      const tableData = students.map((s: any) => [
        s.student_name || s.full_name || 'N/A',
        s.branch || '-',
        `Niv. ${s.level || 1}`,
        s.status === 'present' ? '✅ Présent' : s.status === 'late' ? '⚠️ Retard' : '❌ Absent',
        s.scanned_at ? new Date(s.scanned_at).toLocaleTimeString('fr-FR') : '-'
      ])

      autoTable(doc, {
        head: [['Nom', 'Branche', 'Niveau', 'Statut', 'Heure scan']],
        body: tableData,
        startY: 85,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [240, 240, 240] }
      })

      doc.save(`code_${session.code}_${session.date}.pdf`)
      toast.success('PDF généré avec succès')
    } catch (error) {
      console.error('Erreur PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  const filteredSessions = sessions.filter(session => {
    if (searchTerm && !session.code.includes(searchTerm)) return false
    if (selectedLevel !== 'all' && session.level !== parseInt(selectedLevel)) return false
    if (selectedDate && session.date !== selectedDate) return false
    return true
  })

  const totalPages = Math.ceil(total / limit)

  const inputClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
  const selectClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

  return (
    <div className="space-y-4">
      {/* Barre de recherche et filtres */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="🔍 Rechercher par code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={inputClass + " pl-10"}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2.5 bg-white/10 text-white/80 rounded-lg text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
        >
          <FunnelIcon className="w-4 h-4" />
          Filtres
        </button>
      </div>

      {/* Panneau filtres */}
      {showFilters && (
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">Niveau</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className={selectClass}
              >
                <option value="all">Tous</option>
                <option value="1">Niveau 1</option>
                <option value="2">Niveau 2</option>
                <option value="3">Niveau 3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <button
            onClick={() => { setSearchTerm(''); setSelectedLevel('all'); setSelectedDate('') }}
            className="mt-3 text-xs text-blue-300/80 hover:text-blue-200"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* Statistiques */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white/[0.04] rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-white">{total}</div>
            <div className="text-[10px] text-white/40">Total codes</div>
          </div>
          <div className="bg-white/[0.04] rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-300">
              {sessions.filter(s => s.stats.rate >= 70).length}
            </div>
            <div className="text-[10px] text-white/40">Taux ≥ 70%</div>
          </div>
          <div className="bg-white/[0.04] rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-yellow-300">
              {sessions.filter(s => s.stats.rate >= 50 && s.stats.rate < 70).length}
            </div>
            <div className="text-[10px] text-white/40">Taux 50-70%</div>
          </div>
          <div className="bg-white/[0.04] rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-red-300">
              {sessions.filter(s => s.stats.rate < 50).length}
            </div>
            <div className="text-[10px] text-white/40">Taux &lt; 50%</div>
          </div>
        </div>
      )}

      {/* Liste des codes */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-8 text-center text-white/40 text-sm">
          Aucun code trouvé
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-2xl font-mono font-bold text-white tracking-wider">
                      {session.code}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      session.level 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'bg-green-500/20 text-green-300'
                    }`}>
                      {session.level ? `Niveau ${session.level}` : '🌍 Universel'}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      session.stats.rate >= 70 
                        ? 'bg-green-500/20 text-green-300' 
                        : session.stats.rate >= 50 
                        ? 'bg-yellow-500/20 text-yellow-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {session.stats.rate}%
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" />
                      {new Date(session.date).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <UserGroupIcon className="w-3 h-3" />
                      {session.stats.present} / {session.stats.total} présents
                    </span>
                    {session.lat && session.lng && (
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="w-3 h-3" />
                        Rayon {session.radius}m
                      </span>
                    )}
                    <span className="text-white/30">
                      Expire: {new Date(session.expires_at).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => viewDetail(session)}
                    className="p-2 text-blue-300/80 hover:text-blue-200 hover:bg-white/10 rounded-lg transition-colors"
                    title="Voir détails"
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => exportPDF(session)}
                    className="p-2 text-green-300/80 hover:text-green-200 hover:bg-white/10 rounded-lg transition-colors"
                    title="Exporter PDF"
                  >
                    <DocumentArrowDownIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => deleteSession(session.id)}
                    disabled={deleting === session.id}
                    className="p-2 text-red-300/80 hover:text-red-200 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Supprimer"
                  >
                    {deleting === session.id ? (
                      <div className="w-5 h-5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <TrashIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors disabled:opacity-30"
          >
            ← Précédent
          </button>
          <span className="px-4 py-1.5 text-sm text-white/50">
            Page {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors disabled:opacity-30"
          >
            Suivant →
          </button>
        </div>
      )}

      {/* Modal détails */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(null)}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-auto relative rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-cover bg-center rounded-2xl" style={{ backgroundImage: "url('/ok.png')" }} />
            <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.97) 0%, rgba(15,45,130,0.95) 40%, rgba(10,30,100,0.96) 70%, rgba(4,12,65,0.98) 100%)' }} />
            
            <div className="relative z-10 p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Code: {showDetail.code}
                  </h3>
                  <p className="text-white/50 text-sm">
                    {new Date(showDetail.date).toLocaleDateString('fr-FR')}
                    {showDetail.level && ` - Niveau ${showDetail.level}`}
                  </p>
                </div>
                <button onClick={() => setShowDetail(null)} className="p-2 hover:bg-white/10 rounded-lg">
                  <XMarkIcon className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-white/[0.04] rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-white">{detailStudents.length}</div>
                  <div className="text-xs text-white/40">Total</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-300">
                    {detailStudents.filter((s: any) => s.status === 'present').length}
                  </div>
                  <div className="text-xs text-white/40">Présents</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-red-300">
                    {detailStudents.filter((s: any) => s.status === 'absent').length}
                  </div>
                  <div className="text-xs text-white/40">Absents</div>
                </div>
                <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-yellow-300">
                    {detailStudents.filter((s: any) => s.status === 'late').length}
                  </div>
                  <div className="text-xs text-white/40">Retards</div>
                </div>
              </div>

              {/* Liste des étudiants */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {detailStudents.length === 0 ? (
                  <div className="text-center py-8 text-white/40 text-sm">Aucun étudiant</div>
                ) : (
                  detailStudents.map((s: any) => (
                    <div key={s.id} className="flex justify-between items-center p-2 bg-white/[0.04] border border-white/[0.06] rounded-lg">
                      <span className="text-sm text-white/80">{s.student_name || s.full_name || 'N/A'}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/40">{s.branch || '-'}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          s.status === 'present' 
                            ? 'bg-green-500/20 text-green-300' 
                            : s.status === 'late'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {s.status === 'present' ? '✅ Présent' : s.status === 'late' ? '⚠️ Retard' : '❌ Absent'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
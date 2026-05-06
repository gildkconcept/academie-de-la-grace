'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { EyeIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'

interface SessionHistoryProps {
  userRole: string
  serviceId?: string
}

export const SessionHistory = ({ userRole, serviceId }: SessionHistoryProps) => {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const limit = 20

  useEffect(() => { fetchSessions() }, [page])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const offset = page * limit
      const res = await fetch(`/api/service/session/history?limit=${limit}&offset=${offset}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) { setSessions(data.sessions || []); setTotal(data.total || 0) }
      else toast.error(data.error || 'Erreur chargement historique')
    } catch (error) { toast.error('Erreur réseau') }
    finally { setLoading(false) }
  }

  const viewSessionDetails = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/service/session/get?sessionId=${sessionId}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setSelectedSession(data.session)
        setStudents((data.students || []).map((s: any) => ({ ...s, phone: s.phone || '-' })))
        setShowDetails(true)
      } else toast.error(data.error || 'Erreur chargement détails')
    } catch (error) { toast.error('Erreur réseau') }
  }

  const exportSessionPDF = async (session: any) => {
    try {
      const res = await fetch(`/api/service/session/get?sessionId=${session.id}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        const { jsPDF } = await import('jspdf')
        const autoTable = (await import('jspdf-autotable')).default
        const doc = new jsPDF()
        doc.setFontSize(20); doc.text('Académie de la Grâce', 105, 15, { align: 'center' })
        doc.setFontSize(16); doc.text('Rapport de session', 105, 25, { align: 'center' })
        doc.setFontSize(12)
        doc.text(`Session du ${new Date(session.date).toLocaleDateString('fr-FR')}`, 105, 35, { align: 'center' })
        doc.text(`Type: ${session.session_types?.label || session.type || 'Non défini'}`, 105, 42, { align: 'center' })
        doc.save(`session_${session.date}_${session.id.slice(0, 8)}.pdf`)
        toast.success('PDF généré avec succès')
      }
    } catch (error) { toast.error('Erreur génération PDF') }
  }

  const totalPages = Math.ceil(total / limit)
  const inputClass = "w-full p-2 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

  if (loading && sessions.length === 0) {
    return <div className="text-center py-8 text-white/60">Chargement de l'historique...</div>
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
          📋 Historique des sessions
        </h3>
        <div className="text-sm text-white/50">{total} session(s) au total</div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-8 text-center text-white/40 text-sm">
          Aucune session trouvée
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 hover:bg-white/[0.06] transition-colors">
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <p className="text-white font-medium text-sm">
                    {new Date(session.date).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-white/50 text-xs">
                    {session.session_types?.label || session.type || 'Type non défini'}
                  </p>
                  {userRole === 'superadmin' && session.service && (
                    <p className="text-white/30 text-xs">Service: {session.service.name}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm">
                      <span className="text-green-300 font-medium">{session.stats?.present || 0}</span>
                      <span className="text-white/30"> / {session.stats?.total || 0}</span>
                    </p>
                    <p className="text-white/40 text-xs">Taux: {session.stats?.rate || 0}%</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => viewSessionDetails(session.id)}
                      className="p-2 text-blue-300/80 hover:text-blue-200 hover:bg-white/10 rounded-lg transition-colors" title="Voir détails">
                      <EyeIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => exportSessionPDF(session)}
                      className="p-2 text-green-300/80 hover:text-green-200 hover:bg-white/10 rounded-lg transition-colors" title="Exporter PDF">
                      <DocumentArrowDownIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors disabled:opacity-30">
            Précédent
          </button>
          <span className="px-4 py-1.5 text-sm text-white/50">Page {page + 1} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors disabled:opacity-30">
            Suivant
          </button>
        </div>
      )}

      {/* Modal détails session */}
      {showDetails && selectedSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-auto relative rounded-2xl" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
            <div className="absolute inset-0 bg-cover bg-center rounded-2xl" style={{ backgroundImage: "url('/ok.png')" }} />
            <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.97) 0%, rgba(15,45,130,0.95) 40%, rgba(10,30,100,0.96) 70%, rgba(4,12,65,0.98) 100%)' }} />
            <div className="relative z-10">
              <div className="sticky top-0 bg-[rgba(5,15,70,0.9)] backdrop-blur-2xl border-b border-white/[0.08] p-4 flex justify-between items-center rounded-t-2xl">
                <h3 className="text-lg font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Détails de la session du {new Date(selectedSession.date).toLocaleDateString('fr-FR')}
                </h3>
                <button onClick={() => setShowDetails(false)} className="text-white/50 hover:text-white p-1 text-xl">✕</button>
              </div>
              <div className="p-4">
                <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-white/50">Type:</span> <span className="text-white/80">{selectedSession.session_types?.label || selectedSession.type || 'Non défini'}</span></div>
                  <div><span className="text-white/50">Créée le:</span> <span className="text-white/80">{new Date(selectedSession.created_at).toLocaleString('fr-FR')}</span></div>
                  <div><span className="text-white/50">Total étudiants:</span> <span className="text-white/80">{students.length}</span></div>
                  <div><span className="text-white/50">Présents:</span> <span className="text-green-300">{students.filter(s => s.status === 'present').length}</span></div>
                </div>
                <div className="space-y-2 max-h-96 overflow-auto">
                  <table className="min-w-full">
                    <thead className="bg-white/[0.04] sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs text-white/40">Nom</th>
                        <th className="px-4 py-2 text-left text-xs text-white/40">Téléphone</th>
                        <th className="px-4 py-2 text-left text-xs text-white/40">Statut</th>
                        <th className="px-4 py-2 text-left text-xs text-white/40">Méthode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td className="px-4 py-2 text-sm text-white/80">{student.name}</td>
                          <td className="px-4 py-2 text-sm text-white/60">{student.phone || '-'}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${student.status === 'present' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                              {student.status === 'present' ? 'Présent' : 'Absent'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-white/40">
                            {student.method === 'code' ? 'Code' : student.method === 'manual' ? 'Manuel' : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
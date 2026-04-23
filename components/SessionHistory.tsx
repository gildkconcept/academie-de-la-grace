'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  useEffect(() => {
    fetchSessions()
  }, [page])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const offset = page * limit
      const res = await fetch(`/api/service/session/history?limit=${limit}&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (res.ok) {
        setSessions(data.sessions || [])
        setTotal(data.total || 0)
      } else {
        toast.error(data.error || 'Erreur chargement historique')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const viewSessionDetails = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/service/session/get?sessionId=${sessionId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (res.ok) {
        setSelectedSession(data.session)
        // S'assurer que chaque étudiant a son téléphone
        const studentsWithPhone = (data.students || []).map((student: any) => ({
          ...student,
          phone: student.phone || '-'
        }))
        setStudents(studentsWithPhone)
        setShowDetails(true)
      } else {
        toast.error(data.error || 'Erreur chargement détails')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur réseau')
    }
  }

  const exportSessionPDF = async (session: any) => {
    try {
      const res = await fetch(`/api/service/session/get?sessionId=${session.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (res.ok) {
        const { jsPDF } = await import('jspdf')
        const autoTable = (await import('jspdf-autotable')).default
        const doc = new jsPDF()

        doc.setFontSize(20)
        doc.text('Académie de la Grâce', 105, 15, { align: 'center' })
        doc.setFontSize(16)
        doc.text('Rapport de session', 105, 25, { align: 'center' })
        doc.setFontSize(12)
        doc.text(`Session du ${new Date(session.date).toLocaleDateString('fr-FR')}`, 105, 35, { align: 'center' })
        doc.text(`Type: ${session.session_types?.label || session.type || 'Non défini'}`, 105, 42, { align: 'center' })
        doc.text(`Créée le ${new Date(session.created_at).toLocaleString('fr-FR')}`, 105, 49, { align: 'center' })

        const total = data.students?.length || 0
        const present = data.students?.filter((s: any) => s.status === 'present').length || 0
        const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0

        doc.setFontSize(11)
        doc.text(`Total étudiants: ${total}`, 20, 70)
        doc.text(`Présents: ${present}`, 20, 77)
        doc.text(`Taux de présence: ${attendanceRate}%`, 20, 84)

        const tableData = data.students?.map((student: any) => [
          student.name,
          student.phone || '-',
          student.status === 'present' ? 'Présent' : 'Absent'
        ]) || []

        autoTable(doc, {
          head: [['Nom', 'Téléphone', 'Statut']],
          body: tableData,
          startY: 95,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [79, 70, 229] },
          alternateRowStyles: { fillColor: [240, 240, 240] }
        })

        doc.save(`session_${session.date}_${session.id.slice(0, 8)}.pdf`)
        toast.success('PDF généré avec succès')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur génération PDF')
    }
  }

  const totalPages = Math.ceil(total / limit)

  if (loading && sessions.length === 0) {
    return <div className="text-center py-8">Chargement de l'historique...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">📋 Historique des sessions</h3>
        <div className="text-sm text-gray-500">{total} session(s) au total</div>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            Aucune session trouvée
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <p className="font-semibold">
                      {new Date(session.date).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {session.session_types?.label || session.type || 'Type non défini'}
                    </p>
                    {userRole === 'superadmin' && session.service && (
                      <p className="text-xs text-gray-400">Service: {session.service.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm">
                        <span className="text-green-600 font-medium">{session.stats?.present || 0}</span>
                        <span className="text-gray-400"> / {session.stats?.total || 0}</span>
                      </p>
                      <p className="text-xs text-gray-500">Taux: {session.stats?.rate || 0}%</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => viewSessionDetails(session.id)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Voir détails"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => exportSessionPDF(session)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Exporter PDF"
                      >
                        <DocumentArrowDownIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Précédent
          </Button>
          <span className="px-4 py-2 text-sm">
            Page {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Modal détails session */}
      {showDetails && selectedSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">
                Détails de la session du {new Date(selectedSession.date).toLocaleDateString('fr-FR')}
              </h3>
              <button onClick={() => setShowDetails(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium">Type:</span> {selectedSession.session_types?.label || selectedSession.type || 'Non défini'}</div>
                <div><span className="font-medium">Créée le:</span> {new Date(selectedSession.created_at).toLocaleString('fr-FR')}</div>
                <div><span className="font-medium">Total étudiants:</span> {students.length}</div>
                <div><span className="font-medium">Présents:</span> <span className="text-green-600">{students.filter(s => s.status === 'present').length}</span></div>
              </div>
              <div className="space-y-2 max-h-96 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nom</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Téléphone</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Statut</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Méthode</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-2 text-sm">{student.name}</td>
                        <td className="px-4 py-2 text-sm">{student.phone || '-'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            student.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {student.status === 'present' ? 'Présent' : 'Absent'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
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
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { EyeIcon, MagnifyingGlassIcon, XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { attendanceService } from '@/services/attendanceService'
import { serviceService } from '@/services/serviceService'

export const ServiceHistoryDetail = () => {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [showDetail, setShowDetail] = useState<any>(null)
  const [detailStudents, setDetailStudents] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [selectedService, setSelectedService] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [services, setServices] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'history' | 'stats'>('history')
  const limit = 20

  useEffect(() => { 
    fetchData()
    fetchServices() 
  }, [page, selectedService, selectedType, startDate, endDate])

  const fetchServices = async () => {
    try {
      const data = await serviceService.getAll()
      setServices(data)
    } catch (error) {
      console.error('Erreur chargement services:', error)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await attendanceService.getServiceSessionsHistory(limit, page * limit)
      setSessions(data.sessions || [])
      setStats(data.stats || {})
    } catch (error) {
      console.error('Erreur fetchData:', error)
      toast.error('Erreur chargement historique')
    } finally {
      setLoading(false)
    }
  }

  const viewDetail = async (session: any) => {
    try {
      const data = await attendanceService.getSessionStudents(session.id)
      setShowDetail(data.session || session)
      setDetailStudents(data.students || [])
    } catch (error) {
      console.error('Erreur viewDetail:', error)
      toast.error('Erreur chargement détails')
    }
  }

  const exportPDF = async (session: any) => {
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.text('Académie de la Grâce', 105, 15, { align: 'center' })
      doc.setFontSize(16)
      doc.text('Rapport de séance', 105, 25, { align: 'center' })
      doc.setFontSize(12)
      doc.text(`Date: ${new Date(session.date).toLocaleDateString('fr-FR')}`, 105, 35, { align: 'center' })
      doc.text(`Service: ${session.service?.name || ''}`, 105, 42, { align: 'center' })
      doc.text(`Type: ${session.session_types?.label || session.type || 'Non défini'}`, 105, 49, { align: 'center' })
      doc.text(`Présents: ${session.stats?.present || 0} / ${session.stats?.total || 0}`, 105, 56, { align: 'center' })
      doc.save(`seance_${session.date}_${session.id.slice(0, 8)}.pdf`)
      toast.success('PDF généré')
    } catch (error) { 
      console.error('Erreur PDF:', error)
      toast.error('Erreur génération PDF') 
    }
  }

  const filteredSessions = sessions.filter(session => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      (session.service?.name || '').toLowerCase().includes(term) ||
      (session.session_types?.label || '').toLowerCase().includes(term) ||
      session.date.includes(term)
    )
  })

  const selectClass = "p-2 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

  if (loading && sessions.length === 0) {
    return <div className="text-center py-8 text-white/60">Chargement de l'historique...</div>
  }

  return (
    <div className="space-y-6">
      {/* Onglets */}
      <div className="flex gap-4 border-b border-white/[0.08]">
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2 px-4 text-sm transition-colors ${activeTab === 'history' ? 'border-b-2 border-white text-white font-medium' : 'text-white/50 hover:text-white/80'}`}
        >
          📋 Historique
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-2 px-4 text-sm transition-colors ${activeTab === 'stats' ? 'border-b-2 border-white text-white font-medium' : 'text-white/50 hover:text-white/80'}`}
        >
          📊 Statistiques
        </button>
      </div>

      {/* Stats */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: stats.totalSessions || 0, label: 'Séances totales' },
            { value: stats.totalAttendance || 0, label: 'Présences enregistrées' },
            { value: stats.totalPresent || 0, label: 'Présents' },
            { value: `${stats.globalRate || 0}%`, label: 'Taux de présence' }
          ].map((s, i) => (
            <div key={i} className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-white/50 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Historique */}
      {activeTab === 'history' && (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 p-2 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className={selectClass}>
              <option value="all">Tous les services</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className={selectClass}>
              <option value="all">Tous les types</option>
              <option value="dimanche">Dimanche</option>
              <option value="mardi">Mardi</option>
              <option value="vendredi">Vendredi</option>
            </select>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={selectClass} />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={selectClass} />
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-white/[0.04]">
                <tr>
                  {['Date', 'Service', 'Type', 'Présents', 'Absents', 'Total', 'Taux', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs text-white/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredSessions.map(session => (
                  <tr key={session.id} className="hover:bg-white/[0.04]">
                    <td className="px-4 py-2 text-sm text-white/80">{new Date(session.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-2 text-sm text-white/60">{session.service?.name || '-'}</td>
                    <td className="px-4 py-2 text-sm text-white/60">{session.session_types?.label || session.type || '-'}</td>
                    <td className="px-4 py-2"><span className="text-green-300 text-sm font-medium">{session.stats?.present || 0}</span></td>
                    <td className="px-4 py-2"><span className="text-red-300 text-sm">{session.stats?.absent || 0}</span></td>
                    <td className="px-4 py-2 text-sm text-white/60">{session.stats?.total || 0}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${(session.stats?.rate || 0) >= 70 ? 'bg-green-500/20 text-green-300' : (session.stats?.rate || 0) >= 50 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                        {session.stats?.rate || 0}%
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => viewDetail(session)} className="p-1.5 text-blue-300 hover:text-blue-200 hover:bg-white/10 rounded-lg">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => exportPDF(session)} className="p-1.5 text-green-300 hover:text-green-200 hover:bg-white/10 rounded-lg">
                          <DocumentArrowDownIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal détail */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[rgba(8,20,90,0.97)] backdrop-blur-2xl border border-white/[0.15] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-[rgba(5,15,70,0.9)] p-4 border-b border-white/[0.08] flex justify-between items-center rounded-t-2xl">
              <div>
                <h3 className="text-white font-medium">Séance du {new Date(showDetail.date).toLocaleDateString('fr-FR')}</h3>
                <p className="text-white/50 text-xs">{showDetail.service?.name || ''} - {showDetail.session_types?.label || showDetail.type || ''}</p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-white/50 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-white/[0.04] rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-white">{detailStudents.length}</div>
                  <div className="text-xs text-white/40">Total</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-green-300">{detailStudents.filter((s: any) => s.status === 'present').length}</div>
                  <div className="text-xs text-white/40">Présents</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-red-300">{detailStudents.filter((s: any) => s.status === 'absent').length}</div>
                  <div className="text-xs text-white/40">Absents</div>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-300">{detailStudents.length > 0 ? Math.round((detailStudents.filter((s: any) => s.status === 'present').length / detailStudents.length) * 100) : 0}%</div>
                  <div className="text-xs text-white/40">Taux</div>
                </div>
              </div>
              <table className="min-w-full">
                <thead className="bg-white/[0.04]">
                  <tr>
                    {['Nom', 'Tél', 'Statut', 'Méthode'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs text-white/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {detailStudents.map((s: any) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 text-sm text-white/80">{s.name}</td>
                      <td className="px-4 py-2 text-xs text-white/50">{s.phone || '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${s.status === 'present' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                          {s.status === 'present' ? 'Présent' : 'Absent'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-white/40">{s.method === 'code' ? '📱 Code' : s.method === 'manual' ? '✍️ Manuel' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
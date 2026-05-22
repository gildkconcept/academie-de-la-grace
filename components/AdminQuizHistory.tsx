'use client'

import { useState, useEffect } from 'react'
import { EyeIcon, MagnifyingGlassIcon, FunnelIcon, XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'

export const AdminQuizHistory = () => {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedService, setSelectedService] = useState('all')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [showDetail, setShowDetail] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [branches, setBranches] = useState<string[]>([])
  const [stats, setStats] = useState<any>({})
  const [activeTab, setActiveTab] = useState<'history' | 'stats'>('history')
  const limit = 20

  useEffect(() => { fetchData(); fetchServices() }, [page, selectedLevel, selectedService, selectedBranch])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('limit', limit.toString())
      params.append('offset', (page * limit).toString())
      if (selectedLevel !== 'all') params.append('level', selectedLevel)
      if (selectedService !== 'all') params.append('serviceId', selectedService)
      if (selectedBranch !== 'all') params.append('branch', selectedBranch)
      if (searchTerm) params.append('search', searchTerm)

      const res = await fetch(`/api/quiz/history?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setResults(data.results || [])
        setTotal(data.total || 0)
        setStats(data.stats || {})
      }
    } catch (error) { console.error('Erreur:', error) }
    finally { setLoading(false) }
  }

  const fetchServices = async () => {
    const res = await fetch('/api/services', { credentials: 'include' })
    const data = await res.json()
    if (Array.isArray(data)) {
      setServices(data)
      const uniqueBranches = [...new Set(data.flatMap((s: any) => s.branch || []))].sort()
      setBranches(uniqueBranches as string[])
    }
  }

  const viewDetail = async (resultId: string) => {
    const res = await fetch(`/api/quiz/detail?resultId=${resultId}`, { credentials: 'include' })
    const data = await res.json()
    if (res.ok) setShowDetail(data)
  }

  const totalPages = Math.ceil(total / limit)
  const selectClass = "p-2 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

  return (
    <div className="space-y-6">
      {/* Onglets */}
      <div className="flex gap-4 border-b border-white/[0.08]">
        {[
          { key: 'history', label: '📋 Historique' },
          { key: 'stats', label: '📊 Statistiques' }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`pb-2 px-4 text-sm transition-colors ${activeTab === tab.key ? 'border-b-2 border-white text-white font-medium' : 'text-white/50 hover:text-white/80'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: stats.totalQuizzes, label: 'Quiz complétés' },
            { value: `${stats.averageScore}%`, label: 'Score moyen' },
            { value: stats.perfectScores, label: 'Scores parfaits' },
            { value: stats.totalStudents, label: 'Étudiants' }
          ].map((s, i) => (
            <div key={i} className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-white/50 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Historique - Version responsive */}
      {activeTab === 'history' && (
        <>
          {/* Barre de recherche et filtres */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un étudiant..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 p-2 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 flex items-center justify-center gap-1"
            >
              <FunnelIcon className="w-4 h-4" /> Filtres
            </button>
          </div>

          {/* Filtres déroulants */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className={selectClass}>
                <option value="all">Tous niveaux</option>
                <option value="1">Niveau 1</option>
                <option value="2">Niveau 2</option>
                <option value="3">Niveau 3</option>
              </select>
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className={selectClass}>
                <option value="all">Toutes branches</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className={selectClass}>
                <option value="all">Tous services</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* Version mobile : Cartes */}
          <div className="lg:hidden space-y-3">
            {loading ? (
              <div className="text-center py-8 text-white/50">Chargement...</div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-white/40 text-sm">Aucun résultat</div>
            ) : (
              results.map((r) => (
                <div key={r.id} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium text-sm">{r.student?.full_name}</p>
                      <p className="text-white/40 text-xs">{r.quiz?.title}</p>
                      <p className="text-white/40 text-xs">Niveau {r.quiz?.level}</p>
                    </div>
                    <button
                      onClick={() => viewDetail(r.id)}
                      className="p-2 text-blue-300 hover:text-blue-200 bg-blue-500/10 rounded-lg"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/[0.06]">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      r.percentage >= 70 ? 'bg-green-500/20 text-green-300' : 
                      r.percentage >= 50 ? 'bg-yellow-500/20 text-yellow-300' : 
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {r.score}/{r.total_questions} ({r.percentage}%)
                    </span>
                    <span className="text-xs text-white/40">{new Date(r.submitted_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Version desktop : Tableau */}
          <div className="hidden lg:block bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr>
                  {['Étudiant', 'Quiz', 'Niveau', 'Score', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs text-white/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {results.map(r => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-sm text-white/80">{r.student?.full_name}</td>
                    <td className="px-4 py-2 text-sm text-white/60">{r.quiz?.title}</td>
                    <td className="px-4 py-2 text-sm text-white/60">{r.quiz?.level}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        r.percentage >= 70 ? 'bg-green-500/20 text-green-300' : 
                        r.percentage >= 50 ? 'bg-yellow-500/20 text-yellow-300' : 
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {r.score}/{r.total_questions} ({r.percentage}%)
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-white/40">{new Date(r.submitted_at).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => viewDetail(r.id)} className="text-blue-300 hover:text-blue-200">
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-xs disabled:opacity-30"
              >
                ← Précédent
              </button>
              <span className="px-3 py-1.5 text-white/50 text-xs">Page {page + 1}/{totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-xs disabled:opacity-30"
              >
                Suivant →
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal détail - Version responsive */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[rgba(8,20,90,0.97)] backdrop-blur-2xl border border-white/[0.15] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-[rgba(5,15,70,0.9)] backdrop-blur-2xl p-4 border-b border-white/[0.08] flex justify-between items-center">
              <div>
                <h3 className="text-white font-medium">{showDetail.result?.student?.full_name}</h3>
                <p className="text-white/50 text-xs">{showDetail.result?.quiz?.title} - {showDetail.result?.percentage}%</p>
              </div>
              <button onClick={() => setShowDetail(null)} className="text-white/50 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {showDetail.answers?.map((a: any, i: number) => (
                <div key={a.id} className={`p-3 rounded-lg ${a.is_correct ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <p className="text-white/80 text-sm mb-2">Q{i + 1}: {a.question?.question}</p>
                  <div className="text-xs space-y-1">
                    {['a','b','c','d'].map(l => (
                      <div key={l} className={`p-1.5 rounded ${
                        l.toUpperCase() === a.selected_answer ? 
                          (a.is_correct ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300') : 
                          l.toUpperCase() === a.question?.correct_answer ? 'bg-green-500/10 text-green-300' : 'text-white/50'
                      }`}>
                        {l.toUpperCase()}. {a.question?.[`option_${l}`]}
                        {l.toUpperCase() === a.selected_answer && ' ←'}
                        {l.toUpperCase() === a.question?.correct_answer && ' ✓'}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
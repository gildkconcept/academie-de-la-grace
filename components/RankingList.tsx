// components/RankingList.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { TrophyIcon, FunnelIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface RankingStudent {
  id: string
  rank: number
  final_score: number
  attendance_score: number
  quiz_score: number
  student: {
    id: string
    full_name: string
    username: string
    profile_image_url: string | null
    branch: string
    level: number
    service_name: string
    baptized: boolean
  }
}

export const RankingList = ({ userRole, serviceId }: { userRole: string; serviceId?: string }) => {
  const [rankings, setRankings] = useState<RankingStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')
  const [selectedService, setSelectedService] = useState('all')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [services, setServices] = useState<any[]>([])
  const [branches, setBranches] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [stats, setStats] = useState({ totalStudents: 0, averageScore: 0 })

  useEffect(() => {
    fetchServicesAndBranches()
  }, [])

  useEffect(() => {
    fetchRankings()
  }, [selectedLevel, selectedPeriod, selectedService, selectedBranch])

  const fetchServicesAndBranches = async () => {
    const { data: servicesData } = await supabase.from('services').select('id, name')
    if (servicesData) setServices(servicesData)
    
    const { data: studentsData } = await supabase.from('students').select('branch').is('deleted_at', null)
    if (studentsData) {
      const uniqueBranches = [...new Set(studentsData.map(s => s.branch))].sort()
      setBranches(uniqueBranches)
    }
  }

  const fetchRankings = async () => {
    setLoading(true)
    try {
      let url = `/api/rankings?period=${selectedPeriod}`
      if (selectedLevel !== 'all') url += `&level=${selectedLevel}`
      if (selectedService !== 'all') url += `&serviceId=${selectedService}`
      if (selectedBranch !== 'all') url += `&branch=${encodeURIComponent(selectedBranch)}`
      
      const res = await fetch(url, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setRankings(data.rankings || [])
        setStats(data.stats)
      } else {
        toast.error(data.error || 'Erreur chargement classement')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur chargement classement')
    } finally {
      setLoading(false)
    }
  }

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
  }

  const getMedalColor = (rank: number) => {
    if (rank === 1) return 'from-yellow-500 to-amber-600'
    if (rank === 2) return 'from-gray-400 to-gray-500'
    if (rank === 3) return 'from-amber-600 to-amber-700'
    return 'from-blue-500/20 to-indigo-500/20'
  }

  // Fonction d'export PDF
  const exportRankingsPDF = async () => {
    if (!rankings.length) {
      toast.error('Aucune donnée à exporter')
      return
    }

    const doc = new jsPDF({ orientation: 'landscape' })
    const periodText = selectedPeriod === 'monthly' ? 'Mensuel' : 
                       selectedPeriod === 'weekly' ? 'Hebdomadaire' :
                       selectedPeriod === 'quarterly' ? 'Trimestriel' : 'Annuel'

    // Titre
    doc.setFontSize(20)
    doc.text('Académie de la Grâce', 148, 15, { align: 'center' })
    doc.setFontSize(16)
    doc.text(`Classement académique - ${periodText}`, 148, 25, { align: 'center' })
    
    // Date de génération
    const now = new Date()
    doc.setFontSize(10)
    doc.text(`Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`, 148, 33, { align: 'center' })
    
    // Statistiques
    doc.setFontSize(12)
    doc.text(`Total étudiants: ${stats.totalStudents}`, 20, 45)
    doc.text(`Score moyen: ${stats.averageScore}%`, 20, 52)
    if (stats.topStudent) {
      doc.text(`Meilleur étudiant: ${stats.topStudent.student.full_name} (${Math.round(stats.topStudent.final_score)}%)`, 20, 59)
    }

    // Filtrer les données selon les filtres actuels
    let dataToExport = rankings
    if (selectedLevel !== 'all') {
      dataToExport = dataToExport.filter(r => r.student.level === parseInt(selectedLevel))
    }
    if (selectedService !== 'all') {
      dataToExport = dataToExport.filter(r => r.student.service_id === selectedService)
    }
    if (selectedBranch !== 'all') {
      dataToExport = dataToExport.filter(r => r.student.branch === selectedBranch)
    }

    // Préparer les données du tableau
    const tableData = dataToExport.map(r => [
      `#${r.rank}`,
      r.student.full_name,
      `Niv. ${r.student.level}`,
      r.student.service_name || '-',
      r.student.branch,
      `${Math.round(r.final_score)}%`,
      `${Math.round(r.attendance_score)}%`,
      `${Math.round(r.quiz_score)}%`
    ])

    // Créer le tableau
    autoTable(doc, {
      head: [['Rang', 'Étudiant', 'Niveau', 'Service', 'Branche', 'Score', 'Présence', 'Quiz']],
      body: tableData,
      startY: 68,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 50 },
        2: { cellWidth: 25 },
        3: { cellWidth: 40 },
        4: { cellWidth: 35 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 },
        7: { cellWidth: 25 }
      }
    })

    // Sauvegarder le PDF
    doc.save(`classement_academique_${now.toISOString().split('T')[0]}.pdf`)
    toast.success('PDF exporté avec succès')
  }

  const selectClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  const top3 = rankings.slice(0, 3)
  const rest = rankings.slice(3)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <TrophyIcon className="w-8 h-8 text-yellow-400" />
          <div>
            <h2 className="text-xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              Classement académique
            </h2>
            <p className="text-white/40 text-xs">Basé sur les présences (40%) et quiz (60%)</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Bouton PDF */}
          <button
            onClick={exportRankingsPDF}
            className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors flex items-center gap-2"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-white/10 text-white/80 rounded-lg text-sm hover:bg-white/20 transition-colors flex items-center gap-2"
          >
            <FunnelIcon className="w-4 h-4" />
            Filtres
          </button>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Période</label>
              <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className={selectClass}>
                <option value="weekly">Cette semaine</option>
                <option value="monthly">Ce mois</option>
                <option value="quarterly">Ce trimestre</option>
                <option value="yearly">Cette année</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Niveau</label>
              <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className={selectClass}>
                <option value="all">Tous niveaux</option>
                <option value="1">Niveau 1</option>
                <option value="2">Niveau 2</option>
                <option value="3">Niveau 3</option>
              </select>
            </div>
            {userRole === 'superadmin' && (
              <div>
                <label className="block text-xs text-white/50 mb-1">Service</label>
                <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className={selectClass}>
                  <option value="all">Tous services</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-white/50 mb-1">Branche</label>
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className={selectClass}>
                <option value="all">Toutes branches</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{stats.totalStudents}</div>
          <div className="text-xs text-white/40">Étudiants classés</div>
        </div>
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-300">{Math.round(stats.averageScore)}%</div>
          <div className="text-xs text-white/40">Score moyen</div>
        </div>
      </div>

      {/* Podium Top 3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {top3.map((student, idx) => {
            const rank = idx + 1
            const isSecond = rank === 2
            return (
              <div key={student.id} className={`text-center ${isSecond ? 'order-first' : ''}`}>
                <div className={`relative bg-gradient-to-b ${getMedalColor(rank)} rounded-xl p-3 sm:p-4 backdrop-blur-2xl`}>
                  <div className="text-3xl sm:text-4xl mb-1">{getMedalIcon(rank)}</div>
                  {student.student.profile_image_url ? (
                    <img src={student.student.profile_image_url} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded-full mx-auto object-cover border-2 border-white/20" />
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/20 mx-auto flex items-center justify-center">
                      <span className="text-lg sm:text-2xl font-bold text-white/60">{student.student.full_name?.charAt(0)}</span>
                    </div>
                  )}
                  <p className="text-white font-medium text-xs sm:text-sm mt-2 truncate">{student.student.full_name}</p>
                  <p className="text-white/60 text-[10px] sm:text-xs">Niveau {student.student.level}</p>
                  <p className="text-white font-bold text-sm sm:text-base mt-1">{Math.round(student.final_score)}%</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Liste complète */}
      <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/[0.04]">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-white/40">#</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">Étudiant</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">Niveau</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">Service</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">Branche</th>
                <th className="px-4 py-3 text-center text-xs text-white/40">Score</th>
                <th className="px-4 py-3 text-center text-xs text-white/40">Présence</th>
                <th className="px-4 py-3 text-center text-xs text-white/40">Quiz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rest.map((ranking) => (
                <tr key={ranking.id} className="hover:bg-white/[0.04] transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm text-white/40">#{ranking.rank}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {ranking.student.profile_image_url ? (
                        <img src={ranking.student.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-white/60">{ranking.student.full_name?.charAt(0)}</span>
                        </div>
                      )}
                      <span className="text-sm text-white/80">{ranking.student.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/60">Niveau {ranking.student.level}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{ranking.student.service_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{ranking.student.branch}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-lg font-bold text-white">{Math.round(ranking.final_score)}%</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-12 bg-white/10 rounded-full h-1.5">
                        <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${ranking.attendance_score}%` }} />
                      </div>
                      <span className="text-xs text-white/60">{Math.round(ranking.attendance_score)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className="w-12 bg-white/10 rounded-full h-1.5">
                        <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${ranking.quiz_score}%` }} />
                      </div>
                      <span className="text-xs text-white/60">{Math.round(ranking.quiz_score)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rankings.length === 0 && (
          <div className="text-center py-8 text-white/40 text-sm">Aucun classement disponible</div>
        )}
      </div>
    </div>
  )
}
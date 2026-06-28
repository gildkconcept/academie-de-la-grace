'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import { DocumentArrowDownIcon, FunnelIcon, ArrowPathIcon, ChevronDownIcon, EyeIcon, QrCodeIcon } from '@heroicons/react/24/outline'
import { attendanceService } from '@/services/attendanceService'
import axiosInstance from '@/lib/axios'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Service {
  id: string
  name: string
}

interface MonthlyReportData {
  stats: {
    totalStudents: number
    totalSessions: number
    totalPresent: number
    totalAbsent: number
    totalLate: number
    globalRate: number
    globalAbsenceRate: number
  }
  byService: {
    serviceId: string
    serviceName: string
    studentCount: number
    totalPresent: number
    totalAbsent: number
    totalLate: number
    rate: number
  }[]
  byLevel: {
    level: number
    studentCount: number
    totalPresent: number
    totalAbsent: number
    totalLate: number
    rate: number
  }[]
  byBranch: {
    branch: string
    studentCount: number
    totalPresent: number
    totalAbsent: number
    totalLate: number
    rate: number
  }[]
  weeklyEvolution: {
    week: number
    label: string
    present: number
    absent: number
    rate: number
  }[]
  studentsDetails: {
    id: string
    name: string
    username: string
    serviceId: string
    serviceName: string
    branch: string
    level: number
    baptized: boolean
    phone: string
    presentCount: number
    absentCount: number
    lateCount: number
    expectedPresences: number
    presenceRate: number
    absenceRate: number
  }[]
  alerts: {
    lowParticipationServices: any[]
    frequentAbsentStudents: any[]
    dropFromPreviousMonth: { rate: number; prevRate: number; change: number } | null
  }
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899']

const getRateColor = (rate: number) => {
  if (rate >= 70) return 'text-green-300 bg-green-500/20'
  if (rate >= 50) return 'text-yellow-300 bg-yellow-500/20'
  return 'text-red-300 bg-red-500/20'
}

const getRateBgColor = (rate: number) => {
  if (rate >= 70) return 'bg-green-500'
  if (rate >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

export const MonthlyReports = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<MonthlyReportData | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showFilters, setShowFilters] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [branches, setBranches] = useState<string[]>([])
  
  // Filtres
  const [serviceFilter, setServiceFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [showStudentDetails, setShowStudentDetails] = useState(false)
  const [studentSearchTerm, setStudentSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'presence' | 'name'>('presence')

  // ✅ ÉTATS POUR LES CODES DE PRÉSENCE
  const [activeTab, setActiveTab] = useState<'service' | 'academic'>('service')
  const [selectedCodeLevel, setSelectedCodeLevel] = useState('all')
  const [selectedCodeDate, setSelectedCodeDate] = useState('')
  const [codeSessions, setCodeSessions] = useState<any[]>([])
  const [loadingCodes, setLoadingCodes] = useState(false)

  useEffect(() => {
    fetchServices()
    fetchBranches()
  }, [])

  useEffect(() => {
    fetchReport()
  }, [selectedMonth, selectedYear, serviceFilter, levelFilter, branchFilter])

  const fetchServices = async () => {
    try {
      const { data } = await attendanceService.getServices?.() || []
      setServices(data || [])
    } catch (error) {
      console.error('Erreur fetchServices:', error)
    }
  }

  const fetchBranches = async () => {
    try {
      const { data } = await attendanceService.getBranches?.() || []
      setBranches(data || [])
    } catch (error) {
      console.error('Erreur fetchBranches:', error)
    }
  }

  const fetchReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString()
      })
      if (serviceFilter !== 'all') params.append('serviceId', serviceFilter)
      if (levelFilter !== 'all') params.append('level', levelFilter)
      if (branchFilter !== 'all') params.append('branch', branchFilter)
      
      const result = await attendanceService.getMonthlyReport?.(params) || {}
      setData(result)
    } catch (error) {
      console.error('Erreur fetchReport:', error)
      toast.error('Erreur lors du chargement du rapport')
    } finally {
      setLoading(false)
    }
  }

  // ✅ FONCTION POUR RÉCUPÉRER LES CODES
  const fetchCodeSessions = async () => {
    setLoadingCodes(true)
    try {
      const params = new URLSearchParams()
      if (selectedCodeLevel !== 'all') params.append('level', selectedCodeLevel)
      if (selectedCodeDate) params.append('date', selectedCodeDate)
      
      const response = await axiosInstance.get(`/sessions/history?${params.toString()}`)
      const sessions = response.data.sessions || []
      
      // Enrichir avec les stats
      const enriched = await Promise.all(sessions.map(async (session: any) => {
        try {
          const statsResponse = await axiosInstance.get(`/attendance/session/${session.id}/stats`)
          return {
            ...session,
            stats: statsResponse.data || { total: 0, present: 0, absent: 0, late: 0, rate: 0 }
          }
        } catch {
          return {
            ...session,
            stats: { total: 0, present: 0, absent: 0, late: 0, rate: 0 }
          }
        }
      }))
      
      setCodeSessions(enriched)
    } catch (error) {
      console.error('Erreur chargement codes:', error)
      toast.error('Erreur lors du chargement des codes')
    } finally {
      setLoadingCodes(false)
    }
  }

  // ✅ FONCTION D'EXPORT PDF POUR LES CODES
  const exportCodePDF = async (session: any) => {
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
      doc.text(`Présents: ${session.stats?.present || 0}`, 20, 62)
      doc.text(`Absents: ${session.stats?.absent || 0}`, 20, 69)
      doc.text(`Taux: ${session.stats?.rate || 0}%`, 20, 76)

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

  const exportPDF = async (type: 'all' | 'present' | 'absent') => {
    if (!data) return
    setShowExportMenu(false)
    
    const doc = new jsPDF({ orientation: 'landscape' })
    const monthName = MONTHS[selectedMonth]
    
    doc.setFontSize(20)
    doc.text('Académie de la Grâce', 148, 15, { align: 'center' })
    doc.setFontSize(16)
    doc.text(`Rapport mensuel des présences - ${monthName} ${selectedYear}`, 148, 25, { align: 'center' })
    
    doc.setFontSize(12)
    doc.text(`Total étudiants: ${data.stats.totalStudents}`, 20, 40)
    doc.text(`Présents: ${data.stats.totalPresent}`, 20, 47)
    doc.text(`Absents: ${data.stats.totalAbsent}`, 20, 54)
    doc.text(`Taux de présence: ${data.stats.globalRate}%`, 20, 61)
    
    const now = new Date()
    doc.setFontSize(8)
    doc.text(`Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`, 148, 280, { align: 'center' })
    
    let filteredStudents = [...data.studentsDetails]
    if (type === 'present') {
      filteredStudents = filteredStudents.filter(s => s.presenceRate >= 70)
    } else if (type === 'absent') {
      filteredStudents = filteredStudents.filter(s => s.presenceRate < 30)
    }
    
    const tableData = filteredStudents.map(student => [
      student.name,
      student.serviceName,
      `Niv. ${student.level}`,
      student.branch,
      student.presentCount.toString(),
      student.absentCount.toString(),
      student.lateCount.toString(),
      `${student.presenceRate}%`
    ])
    
    autoTable(doc, {
      head: [['Nom', 'Service', 'Niveau', 'Branche', 'Présents', 'Absents', 'Retards', 'Taux']],
      body: tableData,
      startY: 70,
      styles: { fontSize: 8 },
      headStyles: { fillColor: type === 'present' ? [16, 185, 129] : type === 'absent' ? [239, 68, 68] : [99, 102, 241] },
      alternateRowStyles: { fillColor: [240, 240, 240] }
    })
    
    const suffix = type === 'present' ? 'present' : type === 'absent' ? 'absent' : 'complet'
    doc.save(`rapport_presences_${monthName}_${selectedYear}_${suffix}.pdf`)
    toast.success(`PDF ${type === 'present' ? 'des présents' : type === 'absent' ? 'des absents' : 'complet'} généré`)
  }

  const exportExcel = () => {
    if (!data) return
    setShowExportMenu(false)
    
    const headers = ['Nom', 'Service', 'Niveau', 'Branche', 'Baptisé', 'Téléphone', 'Présents', 'Absents', 'Retards', 'Taux (%)']
    const rows = data.studentsDetails.map(s => [
      s.name,
      s.serviceName,
      s.level,
      s.branch,
      s.baptized ? 'Oui' : 'Non',
      s.phone || '-',
      s.presentCount,
      s.absentCount,
      s.lateCount,
      s.presenceRate
    ])
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.setAttribute('download', `rapport_presences_${MONTHS[selectedMonth]}_${selectedYear}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Export CSV généré')
  }

  const filteredStudents = data?.studentsDetails.filter(s => {
    if (studentSearchTerm === '') return true
    return s.name.toLowerCase().includes(studentSearchTerm.toLowerCase())
  }).sort((a, b) => {
    if (sortBy === 'presence') return b.presenceRate - a.presenceRate
    return a.name.localeCompare(b.name)
  }) || []

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-20">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <span className="mt-3 text-white/60 text-sm">Chargement du rapport...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 sm:py-20 text-white/40 text-sm">
        Aucune donnée disponible pour la période sélectionnée
      </div>
    )
  }

  const serviceChartData = data.byService.map(s => ({
    name: s.serviceName.length > 12 ? s.serviceName.substring(0, 10) + '...' : s.serviceName,
    'Présents': s.totalPresent,
    'Absents': s.totalAbsent,
    'Taux (%)': s.rate
  }))

  const levelChartData = data.byLevel.map(l => ({
    name: `Niveau ${l.level}`,
    'Présents': l.totalPresent,
    'Absents': l.totalAbsent,
    'Taux (%)': l.rate
  }))

  const weeklyData = data.weeklyEvolution.map(w => ({
    name: w.label,
    'Taux (%)': w.rate,
    'Présents': w.present
  }))

  const branchPieData = data.byBranch.map(b => ({
    name: b.branch,
    value: b.rate,
    studentCount: b.studentCount
  }))

  const inputClass = "w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
  const selectClass = "w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header avec sélecteurs */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-stretch sm:items-center gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className={selectClass}
          >
            {MONTHS.map((month, idx) => (
              <option key={idx} value={idx}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className={selectClass}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2.5 bg-white/10 text-white/80 rounded-lg text-sm hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
          >
            <FunnelIcon className="w-4 h-4" />
            <span className="sm:inline">Filtres</span>
            {(serviceFilter !== 'all' || levelFilter !== 'all' || branchFilter !== 'all') && (
              <span className="w-2 h-2 bg-blue-400 rounded-full" />
            )}
          </button>
          <button
            onClick={fetchReport}
            className="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2.5 bg-white/10 text-white/80 rounded-lg text-sm hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <div className="relative flex-1 sm:flex-none">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              <span>Exporter</span>
              <ChevronDownIcon className="w-4 h-4" />
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                  <button onClick={() => exportPDF('all')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-t-lg">
                    📄 Rapport complet
                  </button>
                  <button onClick={() => exportPDF('present')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
                    ✅ Présents
                  </button>
                  <button onClick={() => exportPDF('absent')} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">
                    ❌ Absents
                  </button>
                  <hr className="my-1" />
                  <button onClick={exportExcel} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-b-lg">
                    📊 Export CSV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ✅ ONGLETS : Présences service / Codes de présence */}
      <div className="flex gap-1 border-b border-white/[0.08]">
        <button
          onClick={() => setActiveTab('service')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'service' 
              ? 'border-white text-white' 
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Présences service
        </button>
        <button
          onClick={() => {
            setActiveTab('academic')
            fetchCodeSessions()
          }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'academic' 
              ? 'border-white text-white' 
              : 'border-transparent text-white/50 hover:text-white/80'
          }`}
        >
          <QrCodeIcon className="w-4 h-4" />
          Codes de présence
        </button>
      </div>

      {/* ============ CONTENU PRÉSENCES SERVICE ============ */}
      {activeTab === 'service' && (
        <>
          {/* Panneau filtres */}
          {showFilters && (
            <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-white/80">Filtres avancés</h3>
                <button onClick={() => { setServiceFilter('all'); setLevelFilter('all'); setBranchFilter('all') }} className="text-xs text-blue-300/80 hover:text-blue-200">
                  Réinitialiser
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className={selectClass}>
                  <option value="all">Tous les services</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className={selectClass}>
                  <option value="all">Tous les niveaux</option>
                  <option value="1">Niveau 1</option>
                  <option value="2">Niveau 2</option>
                  <option value="3">Niveau 3</option>
                </select>
                <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className={selectClass}>
                  <option value="all">Toutes les branches</option>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Alertes */}
          {(data.alerts.lowParticipationServices.length > 0 || data.alerts.frequentAbsentStudents.length > 0 || data.alerts.dropFromPreviousMonth) && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 sm:p-4">
              <h3 className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">🚨 Alertes</h3>
              <div className="space-y-1 text-xs sm:text-sm text-amber-300/80">
                {data.alerts.dropFromPreviousMonth && data.alerts.dropFromPreviousMonth.change < -5 && (
                  <p>
                    ⚠️ Baisse de <strong>{Math.abs(data.alerts.dropFromPreviousMonth.change)}%</strong> vs mois précédent
                  </p>
                )}
                {data.alerts.lowParticipationServices.length > 0 && (
                  <p>
                    ⚠️ {data.alerts.lowParticipationServices.length} service(s) avec taux {'<'}50%
                  </p>
                )}
                {data.alerts.frequentAbsentStudents.length > 0 && (
                  <p>
                    ⚠️ {data.alerts.frequentAbsentStudents.length} étudiant(s) avec taux {'<'}30%
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Cartes statistiques */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {[
              { label: 'Étudiants', value: data.stats.totalStudents, color: 'text-indigo-300', bg: 'bg-indigo-500/10' },
              { label: 'Sessions', value: data.stats.totalSessions, color: 'text-blue-300', bg: 'bg-blue-500/10' },
              { label: 'Présents', value: data.stats.totalPresent, color: 'text-green-300', bg: 'bg-green-500/10' },
              { label: 'Absents', value: data.stats.totalAbsent, color: 'text-red-300', bg: 'bg-red-500/10' },
              { label: 'Taux', value: `${data.stats.globalRate}%`, color: getRateColor(data.stats.globalRate).split(' ')[0], bg: getRateColor(data.stats.globalRate).split(' ')[1] }
            ].map((stat, idx) => (
              <div key={idx} className={`${stat.bg} backdrop-blur-2xl border border-white/[0.08] rounded-xl p-2 sm:p-4 text-center`}>
                <div className={`text-lg sm:text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] sm:text-xs text-white/40 mt-0.5 sm:mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Graphiques */}
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-3 sm:p-4">
              <h3 className="text-sm sm:text-base font-normal text-white mb-3 sm:mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>📈 Évolution hebdomadaire</h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} />
                    <YAxis yAxisId="left" domain={[0, 100]} stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.5)" hide />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(8,20,90,0.95)', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="Taux (%)" stroke="#a8caff" strokeWidth={2} name="Taux" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-3 sm:p-4">
              <h3 className="text-sm sm:text-base font-normal text-white mb-3 sm:mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>📊 Par service</h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceChartData} layout="vertical" margin={{ left: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis type="number" domain={[0, 100]} stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={65} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.6)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(8,20,90,0.95)', fontSize: '11px' }} />
                    <Bar dataKey="Taux (%)" fill="#a8caff" name="Taux (%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-normal text-white mb-3 sm:mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>📚 Par niveau</h3>
                <div className="h-52 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={levelChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                      <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(8,20,90,0.95)', fontSize: '11px' }} />
                      <Bar dataKey="Présents" fill="#6ee7b7" name="Présents" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-normal text-white mb-3 sm:mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>🌿 Par branche</h3>
                <div className="h-52 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={branchPieData.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => window.innerWidth >= 640 ? `${name}: ${value}%` : `${value}%`}
                        outerRadius={window.innerWidth >= 640 ? 80 : 60}
                        dataKey="value"
                      >
                        {branchPieData.slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(8,20,90,0.95)', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Tableau détails étudiants */}
          <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl overflow-hidden">
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-white/[0.08] flex justify-between items-center flex-wrap gap-2">
              <h3 className="text-sm sm:text-base font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>👥 Détail des étudiants</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowStudentDetails(!showStudentDetails)} className="px-2 py-1 sm:px-3 sm:py-1.5 bg-white/10 text-white/80 rounded-lg text-xs hover:bg-white/20 transition-colors flex items-center gap-1">
                  <EyeIcon className="w-3.5 h-3.5" />
                  {showStudentDetails ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </div>

            {showStudentDetails && (
              <div>
                <div className="p-3 sm:p-4 border-b border-white/[0.08] flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                  <input
                    type="text"
                    placeholder="🔍 Rechercher..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className={inputClass + " sm:w-64"}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSortBy('presence')}
                      className={`flex-1 sm:flex-none px-2 py-1.5 text-xs rounded-lg transition-colors ${sortBy === 'presence' ? 'bg-white text-[#1a3a8f] font-bold' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                    >
                      Par présence
                    </button>
                    <button
                      onClick={() => setSortBy('name')}
                      className={`flex-1 sm:flex-none px-2 py-1.5 text-xs rounded-lg transition-colors ${sortBy === 'name' ? 'bg-white text-[#1a3a8f] font-bold' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                    >
                      Par nom
                    </button>
                  </div>
                </div>
                
                {/* Version mobile */}
                <div className="block lg:hidden space-y-3 p-3 sm:p-4">
                  {filteredStudents.slice(0, 20).map(student => (
                    <div key={student.id} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{student.name}</p>
                          <p className="text-white/40 text-xs mt-0.5">{student.serviceName}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getRateColor(student.presenceRate)}`}>
                          {student.presenceRate}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/[0.06]">
                        <div className="flex gap-3 text-xs">
                          <span><span className="text-green-300">{student.presentCount}</span> <span className="text-white/40">prés.</span></span>
                          <span><span className="text-red-300">{student.absentCount}</span> <span className="text-white/40">abs.</span></span>
                          <span><span className="text-yellow-300">{student.lateCount}</span> <span className="text-white/40">ret.</span></span>
                        </div>
                        <span className="text-xs text-white/30">Niv.{student.level}</span>
                      </div>
                    </div>
                  ))}
                  {filteredStudents.length > 20 && (
                    <p className="text-center text-white/30 text-xs py-2">
                      + {filteredStudents.length - 20} autres étudiants
                    </p>
                  )}
                </div>

                {/* Version desktop */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-white/[0.04]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Nom</th>
                        <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Service</th>
                        <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Niv.</th>
                        <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Branche</th>
                        <th className="px-4 py-3 text-center text-xs text-white/40 uppercase">Prés.</th>
                        <th className="px-4 py-3 text-center text-xs text-white/40 uppercase">Abs.</th>
                        <th className="px-4 py-3 text-center text-xs text-white/40 uppercase">Ret.</th>
                        <th className="px-4 py-3 text-center text-xs text-white/40 uppercase">Taux</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredStudents.map(student => (
                        <tr key={student.id} className="hover:bg-white/[0.04]">
                          <td className="px-4 py-3 text-sm text-white/80">{student.name}</td>
                          <td className="px-4 py-3 text-sm text-white/60">{student.serviceName}</td>
                          <td className="px-4 py-3 text-sm text-white/60">{student.level}</td>
                          <td className="px-4 py-3 text-sm text-white/60">{student.branch}</td>
                          <td className="px-4 py-3 text-center text-sm text-green-300 font-medium">{student.presentCount}</td>
                          <td className="px-4 py-3 text-center text-sm text-red-300">{student.absentCount}</td>
                          <td className="px-4 py-3 text-center text-sm text-yellow-300">{student.lateCount}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getRateColor(student.presenceRate)}`}>
                              {student.presenceRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-3 sm:px-6 py-3 border-t border-white/[0.08] text-xs text-white/40">
                  {filteredStudents.length} étudiant(s)
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============ CONTENU CODES DE PRÉSENCE ============ */}
      {activeTab === 'academic' && (
        <div className="space-y-4">
          {/* Filtres pour les codes */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-white/50 mb-1">Niveau</label>
              <select
                value={selectedCodeLevel}
                onChange={(e) => {
                  setSelectedCodeLevel(e.target.value)
                  fetchCodeSessions()
                }}
                className={selectClass}
              >
                <option value="all">Tous les niveaux</option>
                <option value="1">Niveau 1</option>
                <option value="2">Niveau 2</option>
                <option value="3">Niveau 3</option>
              </select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-white/50 mb-1">Date</label>
              <input
                type="date"
                value={selectedCodeDate}
                onChange={(e) => {
                  setSelectedCodeDate(e.target.value)
                  fetchCodeSessions()
                }}
                className={inputClass}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedCodeLevel('all')
                  setSelectedCodeDate('')
                  fetchCodeSessions()
                }}
                className="px-4 py-2.5 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          {/* Statistiques des codes */}
          {codeSessions.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white/[0.04] rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-white">{codeSessions.length}</div>
                <div className="text-xs text-white/40">Total codes</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-300">
                  {codeSessions.filter((s: any) => s.stats?.rate >= 70).length}
                </div>
                <div className="text-xs text-white/40">Taux ≥ 70%</div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-yellow-300">
                  {codeSessions.filter((s: any) => s.stats?.rate >= 50 && s.stats?.rate < 70).length}
                </div>
                <div className="text-xs text-white/40">Taux 50-70%</div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-red-300">
                  {codeSessions.filter((s: any) => s.stats?.rate < 50).length}
                </div>
                <div className="text-xs text-white/40">Taux &lt; 50%</div>
              </div>
            </div>
          )}

          {/* Liste des codes */}
          {loadingCodes ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : codeSessions.length === 0 ? (
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-8 text-center text-white/40 text-sm">
              Aucun code trouvé
            </div>
          ) : (
            <div className="space-y-3">
              {codeSessions.map((session: any) => (
                <div key={session.id} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
                  <div className="flex flex-wrap justify-between items-center">
                    <div>
                      <div className="flex items-center gap-3">
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
                          session.stats?.rate >= 70 
                            ? 'bg-green-500/20 text-green-300' 
                            : session.stats?.rate >= 50 
                            ? 'bg-yellow-500/20 text-yellow-300' 
                            : 'bg-red-500/20 text-red-300'
                        }`}>
                          {session.stats?.rate || 0}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-white/40">
                        <span>{new Date(session.date).toLocaleDateString('fr-FR')}</span>
                        <span>{session.stats?.present || 0} / {session.stats?.total || 0} présents</span>
                        {session.expires_at && (
                          <span className="text-white/30">
                            Expire: {new Date(session.expires_at).toLocaleTimeString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => exportCodePDF(session)}
                        className="p-2 text-green-300/80 hover:text-green-200 hover:bg-white/10 rounded-lg transition-colors"
                        title="Exporter PDF"
                      >
                        <DocumentArrowDownIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Barre de taux - Visible dans les deux onglets si data existe */}
      {activeTab === 'service' && (
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm font-normal text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>📊 Synthèse</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm mb-1">
              <span className="text-white/70">Présence: {data.stats.globalRate}%</span>
              <span className="text-white/70">Absence: {data.stats.globalAbsenceRate}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 sm:h-3">
              <div 
                className={`${getRateBgColor(data.stats.globalRate)} h-2 sm:h-3 rounded-full transition-all duration-500`}
                style={{ width: `${data.stats.globalRate}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center text-[10px] sm:text-xs">
              <div className="flex items-center justify-center gap-1"><div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div><span className="text-white/60">Présent: {data.stats.totalPresent}</span></div>
              <div className="flex items-center justify-center gap-1"><div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div><span className="text-white/60">Absent: {data.stats.totalAbsent}</span></div>
              <div className="flex items-center justify-center gap-1"><div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full"></div><span className="text-white/60">Retard: {data.stats.totalLate}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
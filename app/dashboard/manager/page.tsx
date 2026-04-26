'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AttendanceChart, CustomPieChart } from '@/components/charts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Student, Attendance, ServiceSession } from '@/types'
import { generateAttendancePDF } from '@/lib/pdf-generator'
import { 
  UserCircleIcon, 
  UserPlusIcon, 
  Bars3Icon, 
  XMarkIcon, 
  CalendarIcon, 
  FunnelIcon,
  ArrowRightOnRectangleIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'
import { ProfileSection } from '@/components/ProfileSection'
import { AddStudentModal } from '@/components/AddStudentModal'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { SessionHistory } from '@/components/SessionHistory'

export default function ManagerDashboard() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [showProfile, setShowProfile] = useState(false)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('today')
  const [attendanceBySession, setAttendanceBySession] = useState<any[]>([])
  const [studentHistory, setStudentHistory] = useState<any[]>([])
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [serviceName, setServiceName] = useState<string>('')
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    baptized: 0,
    averageProgress: 0
  })
  const [loadingData, setLoadingData] = useState(true)

  // États pour la présence service (checkbox)
  const [serviceSession, setServiceSession] = useState<ServiceSession | null>(null)
  const [serviceStudents, setServiceStudents] = useState<any[]>([])
  const [allSessions, setAllSessions] = useState<any[]>([])
  const [showSessionSelector, setShowSessionSelector] = useState(false)
  const [loadingService, setLoadingService] = useState(false)
  
  // États pour les filtres
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // États pour les types de sessions (culte)
  const [sessionTypes, setSessionTypes] = useState<any[]>([])
  const [selectedType, setSelectedType] = useState<string>('')

  // Dashboard service
  const [serviceStats, setServiceStats] = useState<{
    totalMembers: number;
    averageAttendanceRate: number;
    activeMembers: number;
    inactiveMembers: number;
    members: (Student & { attendanceRate: number; isActive: boolean })[];
  } | null>(null)
  const [activeInactiveData, setActiveInactiveData] = useState<{ name: string; value: number }[]>([])

  // === ÉTATS POUR LA LISTE DES MEMBRES (RECHERCHE + FILTRES) ===
  const [memberSearchTerm, setMemberSearchTerm] = useState<string>('')
  const [memberLevelFilter, setMemberLevelFilter] = useState<string>('all')
  const [memberBaptismFilter, setMemberBaptismFilter] = useState<string>('all')
  const [memberMaisonGraceFilter, setMemberMaisonGraceFilter] = useState<string>('all')
  const [memberMaisonGraceSearch, setMemberMaisonGraceSearch] = useState<string>('')
  const [maisonGraceList, setMaisonGraceList] = useState<string[]>([])
  const [showMemberFilters, setShowMemberFilters] = useState(false)

  const toggleProfile = () => {
    setShowProfile(!showProfile)
    setMobileMenuOpen(false)
  }
  
  const [showHistory, setShowHistory] = useState(false)

  const handleStudentAdded = () => {
    fetchData()
    fetchCurrentSession()
    fetchServiceStats()
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    if (user?.role === 'student') {
      router.push('/dashboard/student')
    }
    if (user?.role === 'superadmin') {
      router.push('/dashboard/superadmin')
    }
    if (user?.serviceId) {
      fetchServiceName()
      fetchData()
      fetchSessions()
      fetchCurrentSession()
      fetchSessionTypes()
      fetchServiceStats()
    }
  }, [user, loading])

  const fetchServiceName = async () => {
    try {
      const { data } = await supabase
        .from('services')
        .select('name')
        .eq('id', user?.serviceId)
        .single()
      
      if (data) {
        setServiceName(data.name)
      }
    } catch (error) {
      console.error('Erreur chargement service:', error)
    }
  }

  const fetchData = async () => {
    setLoadingData(true)
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('service_id', user?.serviceId)
        .is('deleted_at', null)

      if (studentsError) throw studentsError

      if (studentsData) {
        setStudents(studentsData)
        
        const today = new Date().toISOString().split('T')[0]
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*, students(*)')
          .eq('date', today)
          .in('student_id', studentsData.map(s => s.id))

        if (attendanceError) throw attendanceError

        if (attendanceData) {
          setAttendance(attendanceData)
        }

        const { data: progressData } = await supabase
          .from('progress')
          .select('*')
          .in('student_id', studentsData.map(s => s.id))

        const avgProgress = progressData?.length 
          ? progressData.reduce((acc, p) => acc + (p.score || 0), 0) / progressData.length 
          : 0

        setStats({
          totalStudents: studentsData.length,
          presentToday: attendanceData?.filter(a => a.status === 'present').length || 0,
          baptized: studentsData.filter(s => s.baptized === true || String(s.baptized) === 'true').length,
          averageProgress: Math.round(avgProgress)
        })
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoadingData(false)
    }
  }

  const fetchSessions = async () => {
    try {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('service_id', user?.serviceId)
        .order('date', { ascending: false })
        .limit(10)
      
      if (data) {
        setSessions(data)
      }
    } catch (error) {
      console.error('Erreur chargement sessions:', error)
    }
  }

  const fetchCurrentSession = async () => {
    try {
      const res = await fetch('/api/service/session/current', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await res.json()
      
      if (res.ok) {
        setServiceSession(data.session)
        setServiceStudents(data.students || [])
        
        const allRes = await fetch('/api/service/session/all', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        const allData = await allRes.json()
        if (allRes.ok) {
          setAllSessions(allData.sessions || [])
        }
      } else {
        console.error('Erreur API:', data.error)
      }
    } catch (error) {
      console.error('Erreur récupération sessions:', error)
    }
  }

  const fetchSessionStudents = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/service/session/get?sessionId=${sessionId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (res.ok) {
        setServiceSession(data.session)
        setServiceStudents(data.students || [])
      }
    } catch (error) {
      console.error('Erreur récupération étudiants:', error)
    }
  }

  const fetchSessionTypes = async () => {
    try {
      const res = await fetch('/api/session-types', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (res.ok) {
        setSessionTypes(data)
      }
    } catch (error) {
      console.error('Erreur chargement types:', error)
    }
  }

  const fetchServiceStats = async () => {
    if (!user?.serviceId) return
    try {
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .eq('service_id', user.serviceId)
        .is('deleted_at', null)
      
      if (!studentsData || studentsData.length === 0) {
        setServiceStats(null)
        return
      }

      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('id')
        .eq('service_id', user.serviceId)
      
      const totalSessions = sessionsData?.length || 0

      const studentAttendanceRates = await Promise.all(studentsData.map(async (student) => {
        const { data: attendances } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', student.id)
          .eq('status', 'present')
        const presentCount = attendances?.length || 0
        const rate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0
        return { ...student, attendanceRate: rate, isActive: rate >= 70 }
      }))

      const averageRate = studentAttendanceRates.reduce((acc, s) => acc + s.attendanceRate, 0) / studentAttendanceRates.length
      const activeCount = studentAttendanceRates.filter(s => s.isActive).length
      const inactiveCount = studentAttendanceRates.length - activeCount

      setServiceStats({
        totalMembers: studentAttendanceRates.length,
        averageAttendanceRate: Math.round(averageRate),
        activeMembers: activeCount,
        inactiveMembers: inactiveCount,
        members: studentAttendanceRates.map(s => ({
          ...s,
          attendanceRate: Math.round(s.attendanceRate),
          isActive: s.isActive
        }))
      })

      setActiveInactiveData([
        { name: 'Actifs (≥70%)', value: activeCount },
        { name: 'Inactifs (<70%)', value: inactiveCount }
      ])
    } catch (error) {
      console.error('Erreur calcul stats service:', error)
    }
  }

  const startServiceSession = async () => {
    if (!selectedType) {
      toast.error('Veuillez sélectionner un type de culte')
      return
    }

    setLoadingService(true)
    try {
      const res = await fetch('/api/service/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          date: new Date().toISOString().split('T')[0],
          type: selectedType
        })
      })
      const data = await res.json()
      
      if (res.ok) {
        toast.success(`Session ${sessionTypes.find(t => t.code === selectedType)?.label} démarrée`)
        setSelectedType('')
        fetchCurrentSession()
        fetchServiceStats()
      } else {
        toast.error(data.error || 'Erreur lors du démarrage')
      }
    } catch (error) {
      console.error('Erreur démarrage session:', error)
      toast.error('Erreur lors du démarrage')
    } finally {
      setLoadingService(false)
    }
  }

  const changeSession = (sessionId: string) => {
    fetchSessionStudents(sessionId)
    setShowSessionSelector(false)
  }

  const togglePresence = (studentId: string) => {
    setServiceStudents(prev => prev.map(s => 
      s.id === studentId 
        ? { ...s, status: s.status === 'present' ? 'absent' : 'present' }
        : s
    ))
  }

  const saveAttendances = async () => {
    if (!serviceSession) {
      toast.error('Aucune session active')
      return
    }

    setLoadingService(true)
    try {
      const attendances = serviceStudents.map(s => ({
        studentId: s.id,
        status: s.status
      }))

      const res = await fetch('/api/service/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sessionId: serviceSession.id,
          attendances
        })
      })

      const data = await res.json()
      
      if (res.ok) {
        toast.success('Présences enregistrées')
        fetchCurrentSession()
        fetchServiceStats()
      } else {
        toast.error(data.error || 'Erreur')
      }
    } catch (error) {
      console.error('Erreur enregistrement:', error)
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setLoadingService(false)
    }
  }

  const fetchAttendanceBySession = async (sessionId: string) => {
    if (sessionId === 'today') {
      setAttendanceBySession([])
      return
    }

    try {
      const { data } = await supabase
        .from('attendance')
        .select(`
          *,
          students (
            id,
            full_name,
            branch,
            level,
            baptized,
            phone
          )
        `)
        .eq('session_id', sessionId)
      
      if (data) {
        setAttendanceBySession(data)
      }
    } catch (error) {
      console.error('Erreur chargement présences:', error)
    }
  }

  const fetchStudentHistory = async (studentId: string) => {
    try {
      const { data } = await supabase
        .from('attendance')
        .select(`
          *,
          sessions (
            date,
            created_at,
            code
          )
        `)
        .eq('student_id', studentId)
        .order('date', { ascending: false })
      
      if (data) {
        setStudentHistory(data)
        setShowHistoryModal(true)
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error)
      toast.error('Erreur lors du chargement de l\'historique')
    }
  }

  const generateAcademicPDF = async (type: 'all' | 'present' | 'absent') => {
    if (selectedSession === 'today') {
      toast.error('Veuillez sélectionner une séance académique')
      return
    }

    try {
      const session = sessions.find(s => s.id === selectedSession)
      if (!session) return

      const { data: attendanceDetails } = await supabase
        .from('attendance')
        .select(`
          *,
          students (
            id,
            full_name,
            branch,
            level,
            baptized,
            phone
          )
        `)
        .eq('session_id', selectedSession)

      const attendanceData = attendanceDetails?.map(a => ({
        student: a.students,
        status: a.status,
        scanned_at: a.scanned_at
      })) || []

      const sessionDate = new Date(session.date).toLocaleDateString('fr-FR')

      generateAttendancePDF(
        session.code,
        sessionDate,
        students,
        attendanceData,
        serviceName,
        type
      )

      const typeText = type === 'present' ? 'des présents' : type === 'absent' ? 'des absents' : 'complet'
      toast.success(`PDF académique ${typeText} généré avec succès`)
    } catch (error) {
      console.error('Erreur génération PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  const generateServicePDF = async (type: 'all' | 'present' | 'absent', session?: ServiceSession) => {
    const targetSession = session || serviceSession
    
    if (!targetSession) {
      toast.error('Aucune session service sélectionnée')
      return
    }

    try {
      let sessionStudentsData = serviceStudents
      
      if (targetSession.id !== serviceSession?.id) {
        const res = await fetch(`/api/service/session/get?sessionId=${targetSession.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        const data = await res.json()
        if (res.ok) {
          sessionStudentsData = data.students || []
        }
      }
      
      const doc = new jsPDF()

      doc.setFontSize(20)
      doc.text('Académie de la Grâce', 105, 15, { align: 'center' })
      doc.setFontSize(16)
      doc.text('Rapport de présence service', 105, 25, { align: 'center' })

      doc.setFontSize(12)
      doc.text(`Service: ${serviceName}`, 105, 35, { align: 'center' })

      const cultType = targetSession.type
        ? sessionTypes.find(t => t.code === targetSession.type)?.label || targetSession.type
        : 'Non défini'
      doc.text(`Type de culte: ${cultType}`, 105, 42, { align: 'center' })

      doc.text(`Date: ${new Date(targetSession.date).toLocaleDateString('fr-FR')}`, 105, 49, { align: 'center' })
      doc.text(`Heure: ${new Date(targetSession.created_at).toLocaleTimeString('fr-FR')}`, 105, 56, { align: 'center' })

      const total = sessionStudentsData.length
      const present = sessionStudentsData.filter((s: any) => s.status === 'present').length
      const absent = sessionStudentsData.filter((s: any) => s.status === 'absent').length
      const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0

      doc.setFontSize(11)
      doc.text(`Total étudiants: ${total}`, 20, 70)
      doc.text(`Présents: ${present}`, 20, 77)
      doc.text(`Absents: ${absent}`, 20, 84)
      doc.text(`Taux de présence: ${attendanceRate}%`, 20, 91)

      const now = new Date()
      doc.setFontSize(8)
      doc.text(`Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`, 105, 280, { align: 'center' })

      let filteredStudents = sessionStudentsData
      if (type === 'present') filteredStudents = sessionStudentsData.filter((s: any) => s.status === 'present')
      else if (type === 'absent') filteredStudents = sessionStudentsData.filter((s: any) => s.status === 'absent')

      const tableData = filteredStudents.map((student: any) => [
        student.name || 'N/A',
        student.status === 'present' ? 'Présent' : 'Absent'
      ])

      autoTable(doc, {
        head: [['Nom', 'Statut']],
        body: tableData,
        startY: 100,
        styles: { fontSize: 10 },
        headStyles: { fillColor: type === 'present' ? [16, 185, 129] : type === 'absent' ? [239, 68, 68] : [79, 70, 229] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 40 } }
      })

      const fileName = `presence_service_${serviceName}_${new Date(targetSession.date).toISOString().split('T')[0]}_${type}.pdf`
      doc.save(fileName)
      
      const typeText = type === 'present' ? 'des présents' : type === 'absent' ? 'des absents' : 'complet'
      toast.success(`PDF service ${typeText} généré avec succès`)
    } catch (error) {
      console.error('Erreur génération PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  // === GÉNÉRER LE PDF DE LA LISTE DES MEMBRES FILTRÉS ===
  const generateMembersPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF()

      doc.setFontSize(20)
      doc.text('Académie de la Grâce', 105, 15, { align: 'center' })
      doc.setFontSize(16)
      doc.text(`Liste des membres - ${serviceName}`, 105, 25, { align: 'center' })
      
      const now = new Date()
      doc.setFontSize(10)
      doc.text(`Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`, 105, 33, { align: 'center' })
      
      doc.setFontSize(12)
      doc.text(`Total: ${filteredMembers.length} membres`, 14, 45)
      
      const activeCount = filteredMembers.filter(m => {
        const member = serviceStats?.members.find(sm => sm.id === m.id)
        return member?.isActive
      }).length
      
      doc.text(`Actifs (≥70%): ${activeCount}`, 14, 52)
      doc.text(`Inactifs (<70%): ${filteredMembers.length - activeCount}`, 14, 59)

      const tableData = filteredMembers.map(member => {
        const stats = serviceStats?.members.find(m => m.id === member.id)
        const attendanceRate = stats?.attendanceRate || 0
        const isActive = stats?.isActive || false
        const maisonGrace = (member as any).maison_grace || '-'
        
        return [
          member.full_name || 'N/A',
          member.username || '-',
          `Niv. ${member.level || 1}`,
          member.branch || '-',
          (member.baptized === true || String(member.baptized) === 'true') ? 'Oui' : 'Non',
          maisonGrace,
          member.phone || '-',
          `${attendanceRate}%`,
          isActive ? 'Actif' : 'Inactif'
        ]
      })

      autoTable(doc, {
        head: [['Nom', 'Username', 'Niveau', 'Branche', 'Baptême', 'Maison grâce', 'Téléphone', 'Présence', 'Statut']],
        body: tableData,
        startY: 65,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 20 },
          2: { cellWidth: 14 },
          3: { cellWidth: 20 },
          4: { cellWidth: 16 },
          5: { cellWidth: 22 },
          6: { cellWidth: 22 },
          7: { cellWidth: 18 },
          8: { cellWidth: 18 }
        }
      })

      const dateStr = now.toISOString().split('T')[0]
      doc.save(`membres_${serviceName.replace(/\s+/g, '_')}_${dateStr}.pdf`)
      toast.success('PDF des membres généré avec succès')
    } catch (error) {
      console.error('Erreur génération PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('⚠️ Voulez-vous vraiment supprimer cet étudiant ? Cette action est irréversible.')) return
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Étudiant supprimé')
        fetchData()
        fetchServiceStats()
      } else {
        toast.error(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error(error)
      toast.error('Erreur serveur')
    }
  }

  const filteredServiceStudents = serviceStudents.filter(student => {
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter
    const matchesSearch = searchTerm === '' || student.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const presentCount = serviceStudents.filter(s => s.status === 'present').length
  const absentCount = serviceStudents.filter(s => s.status === 'absent').length
  const attendanceRate = serviceStudents.length > 0 ? Math.round((presentCount / serviceStudents.length) * 100) : 0

  // === FILTRER LES MEMBRES DU SERVICE ===
  const getFilteredMembers = () => {
    const members = serviceStats?.members || students
    
    // Mettre à jour la liste des maisons de grâce
    const maisons = new Set<string>()
    members.forEach(m => {
      if ((m as any).maison_grace && (m as any).maison_grace.trim() !== '') {
        maisons.add((m as any).maison_grace.trim())
      }
    })
    const newList = Array.from(maisons).sort()
    if (JSON.stringify(newList) !== JSON.stringify(maisonGraceList)) {
      setMaisonGraceList(newList)
    }
    
    return members.filter(member => {
      const matchesSearch = memberSearchTerm === '' || 
        (member.full_name || '').toLowerCase().includes(memberSearchTerm.toLowerCase())
      
      const matchesLevel = memberLevelFilter === 'all' || 
        member.level?.toString() === memberLevelFilter
      
      const matchesBaptism = memberBaptismFilter === 'all' || 
        (memberBaptismFilter === 'yes' && (member.baptized === true || String(member.baptized) === 'true')) ||
        (memberBaptismFilter === 'no' && member.baptized !== true && String(member.baptized) !== 'true')
      
      // Filtre par maison de grâce (sélection)
      const matchesMaisonGrace = memberMaisonGraceFilter === 'all' || 
        ((member as any).maison_grace || '').trim() === memberMaisonGraceFilter
      
      // Recherche par maison de grâce (texte libre)
      const matchesMaisonGraceSearch = memberMaisonGraceSearch === '' || 
        ((member as any).maison_grace || '').toLowerCase().includes(memberMaisonGraceSearch.toLowerCase())
      
      return matchesSearch && matchesLevel && matchesBaptism && matchesMaisonGrace && matchesMaisonGraceSearch
    })
  }

  const filteredMembers = getFilteredMembers()

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-base sm:text-lg">Chargement de votre espace...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const currentLevel = user?.level || 1

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Barre de navigation responsive */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
              >
                {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
              </button>
              <h1 className="text-base sm:text-lg font-semibold truncate max-w-[180px] sm:max-w-none">
                {showProfile ? 'Mon profil' : user.name}
              </h1>
              {!showProfile && serviceName && (
                <span className="hidden lg:inline-block ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                  {serviceName}
                </span>
              )}
            </div>

            {/* Boutons desktop */}
            <div className="hidden lg:flex items-center gap-3">
              {!showProfile && (
                <Button onClick={() => setShowAddStudentModal(true)} variant="outline" size="sm">
                  <UserPlusIcon className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              )}
              <Button
                onClick={() => setShowHistory(!showHistory)}
                variant="outline"
                size="sm"
              >
                {showHistory ? 'Masquer' : 'Afficher'} l'historique
              </Button>
              <Button onClick={toggleProfile} variant="outline" size="sm">
                <UserCircleIcon className="w-4 h-4 mr-1" />
                {showProfile ? 'Tableau de bord' : 'Profil'}
              </Button>
              <Button onClick={logout} variant="destructive" size="sm">
                Déconnexion
              </Button>
            </div>

            <button onClick={logout} className="lg:hidden p-2 text-red-600 hover:bg-red-50 rounded-full">
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Menu mobile */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 bg-white">
              <div className="px-4 py-3 space-y-2">
                <p className="text-sm text-gray-600 pb-2 border-b">Connecté en tant que {user.name}</p>
          
                {!showProfile && (
                  <button
                    onClick={() => {
                      setShowAddStudentModal(true)
                      setMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <UserPlusIcon className="w-5 h-5 mr-3" />
                    Ajouter un étudiant
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowHistory(!showHistory)
                    setMobileMenuOpen(false)
                  }}
                  className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                >
                  <CalendarIcon className="w-5 h-5 mr-3" />
                  {showHistory ? 'Masquer' : 'Afficher'} l'historique
                </button>
                <button
                  onClick={() => {
                    setShowProfile(!showProfile)
                    setMobileMenuOpen(false)
                  }}
                  className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                >
                  <UserCircleIcon className="w-5 h-5 mr-3" />
                  {showProfile ? 'Tableau de bord' : 'Mon profil'}
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
                  Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {!showProfile && serviceName && (
        <div className="lg:hidden px-4 py-1.5 bg-indigo-50 text-indigo-700 text-xs text-center">
          Service : {serviceName}
        </div>
      )}

      {showProfile ? (
        <ProfileSection user={user} onClose={() => setShowProfile(false)} />
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          
          {/* Dashboard service */}
          {serviceStats && (
            <Card className="mb-6">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ChartBarIcon className="w-5 h-5 text-indigo-600" />
                  📊 Tableau de bord du service
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-indigo-600">{serviceStats.totalMembers}</div>
                    <div className="text-xs text-gray-500">Membres</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{serviceStats.averageAttendanceRate}%</div>
                    <div className="text-xs text-gray-500">Présence moyenne</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{serviceStats.activeMembers}</div>
                    <div className="text-xs text-gray-500">Actifs (≥70%)</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Répartition actifs / inactifs</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={activeInactiveData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {activeInactiveData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section Historique des sessions */}
          {showHistory && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>📋 Historique des sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <SessionHistory userRole={user?.role || 'service_manager'} />
              </CardContent>
            </Card>
          )}

          {/* Section Présence Service */}
          <Card className="mb-6">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                📋 Présence Service - {serviceName}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de culte <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Sélectionnez un type</option>
                  {sessionTypes.map(type => (
                    <option key={type.code} value={type.code}>
                      {type.label} ({type.day_of_week === 'Sunday' ? 'Dimanche' : type.day_of_week === 'Tuesday' ? 'Mardi' : 'Vendredi'})
                    </option>
                  ))}
                </select>
              </div>

              <Button
                onClick={startServiceSession}
                disabled={loadingService || !selectedType}
                variant="outline"
                className="w-full border-green-500 text-green-600"
              >
                + Nouvelle session
              </Button>

              {allSessions.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setShowSessionSelector(!showSessionSelector)}
                    className="flex items-center gap-1 text-sm text-gray-600"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    {serviceSession ? `Session du ${new Date(serviceSession.date).toLocaleDateString('fr-FR')}` : 'Choisir une session'}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showSessionSelector && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                      {allSessions.map(session => (
                        <div key={session.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b">
                          <button
                            onClick={() => changeSession(session.id)}
                            className="flex-1 text-left text-sm"
                          >
                            {new Date(session.date).toLocaleDateString('fr-FR')}
                          </button>
                          <div className="flex gap-1">
                            <button onClick={() => generateServicePDF('all', session)} className="p-1 text-indigo-600" title="PDF complet">📄</button>
                            <button onClick={() => generateServicePDF('present', session)} className="p-1 text-green-600" title="PDF présents">✓</button>
                            <button onClick={() => generateServicePDF('absent', session)} className="p-1 text-red-600" title="PDF absents">✗</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {serviceSession && (
                <>
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {new Date(serviceSession.date).toLocaleDateString('fr-FR')} à {new Date(serviceSession.created_at).toLocaleTimeString()}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-600" onClick={() => generateServicePDF('all')}>📄</Button>
                      <Button size="sm" variant="outline" className="text-green-600 border-green-600" onClick={() => generateServicePDF('present')}>✅</Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-600" onClick={() => generateServicePDF('absent')}>❌</Button>
                      <Button size="sm" onClick={saveAttendances} disabled={loadingService}>Enregistrer</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 p-2 rounded"><div className="font-bold">{serviceStudents.length}</div><div className="text-xs">Total</div></div>
                    <div className="bg-green-50 p-2 rounded"><div className="font-bold text-green-600">{presentCount}</div><div className="text-xs">Présents</div></div>
                    <div className="bg-red-50 p-2 rounded"><div className="font-bold text-red-600">{absentCount}</div><div className="text-xs">Absents</div></div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs"><span>Taux de présence</span><span>{attendanceRate}%</span></div>
                    <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${attendanceRate}%` }}></div></div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <input type="text" placeholder="Rechercher un étudiant..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                    <div className="flex gap-2">
                      {['all', 'present', 'absent'].map(f => (
                        <button key={f} onClick={() => setStatusFilter(f)} className={`flex-1 py-1 text-sm rounded ${statusFilter === f ? (f === 'present' ? 'bg-green-600 text-white' : f === 'absent' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white') : 'bg-gray-100 text-gray-700'}`}>
                          {f === 'all' ? 'Tous' : f === 'present' ? 'Présents' : 'Absents'} ({f === 'all' ? serviceStudents.length : f === 'present' ? presentCount : absentCount})
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-80 overflow-auto border rounded-lg p-2">
                    {filteredServiceStudents.map(student => (
                      <div key={student.id} onClick={() => togglePresence(student.id)} className={`flex justify-between items-center p-2 rounded cursor-pointer ${student.status === 'present' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                        <span className="text-sm font-medium">{student.name}</span>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={student.status === 'present'} onChange={() => togglePresence(student.id)} onClick={(e) => e.stopPropagation()} className="w-5 h-5" />
                          <span className={`text-xs ${student.status === 'present' ? 'text-green-600' : 'text-gray-400'}`}>{student.status === 'present' ? 'Présent' : 'Absent'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Bloc d'information présence académique */}
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <span className="text-2xl">🎓</span>
                <div>
                  <h3 className="font-semibold text-blue-800">Présence Académique</h3>
                  <p className="text-xs text-blue-600">Codes générés par l'administrateur. Les étudiants entrent ces codes pour valider leur présence aux cours.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Card><CardContent className="p-3 text-center"><div className="text-xs text-gray-500">Total</div><div className="text-xl font-bold">{stats.totalStudents}</div></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><div className="text-xs text-gray-500">Présents service</div><div className="text-xl font-bold text-green-600">{presentCount}</div></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><div className="text-xs text-gray-500">Baptisés</div><div className="text-xl font-bold text-blue-600">{stats.baptized}</div></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><div className="text-xs text-gray-500">Progression</div><div className="text-xl font-bold text-purple-600">{stats.averageProgress}%</div></CardContent></Card>
          </div>

          {/* Historique des présences académiques */}
          <Card className="mb-6">
            <CardHeader className="px-4 py-3"><CardTitle className="text-base">Historique Présences Académiques</CardTitle></CardHeader>
            <CardContent className="px-4 pb-5">
              <select value={selectedSession} onChange={(e) => { setSelectedSession(e.target.value); fetchAttendanceBySession(e.target.value); }} className="w-full p-2 border rounded-lg text-sm mb-3">
                <option value="today">Aujourd'hui</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{new Date(s.date).toLocaleDateString('fr-FR')} - Code: {s.code}</option>)}
              </select>
              {selectedSession !== 'today' && (
                <>
                  <div className="flex justify-end gap-2 mb-3">
                    <Button size="sm" variant="outline" className="text-indigo-600" onClick={() => generateAcademicPDF('all')}>📄 Complet</Button>
                    <Button size="sm" variant="outline" className="text-green-600" onClick={() => generateAcademicPDF('present')}>✅ Présents</Button>
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => generateAcademicPDF('absent')}>❌ Absents</Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="bg-green-50 p-2 rounded"><div className="font-bold text-green-600">{attendanceBySession.filter(a => a.status === 'present').length}</div><div className="text-xs">Présents</div></div>
                    <div className="bg-red-50 p-2 rounded"><div className="font-bold text-red-600">{attendanceBySession.filter(a => a.status === 'absent').length}</div><div className="text-xs">Absents</div></div>
                    <div className="bg-yellow-50 p-2 rounded"><div className="font-bold text-yellow-600">{attendanceBySession.filter(a => a.status === 'late').length}</div><div className="text-xs">Retards</div></div>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-auto border rounded-lg p-2">
                    {students.map(s => {
                      const att = attendanceBySession.find(a => a.student_id === s.id);
                      return (
                        <div key={s.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">{s.full_name}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${att ? (att.status === 'present' ? 'bg-green-100 text-green-800' : att.status === 'late' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800') : 'bg-red-100 text-red-800'}`}>
                            {att ? (att.status === 'present' ? '✓ Présent' : att.status === 'late' ? '⚠ Retard' : '✗ Absent') : '✗ Absent'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Graphiques */}
          <div className="grid grid-cols-1 gap-6 mb-6">
            <Card><CardHeader><CardTitle className="text-base">Présences par mois</CardTitle></CardHeader><CardContent><AttendanceChart data={[{ month: 'Jan', presents: 65 }, { month: 'Fév', presents: 59 }, { month: 'Mar', presents: 80 }, { month: 'Avr', presents: 81 }, { month: 'Mai', presents: 56 }, { month: 'Juin', presents: 55 }]} /></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Répartition Baptême</CardTitle></CardHeader><CardContent><CustomPieChart data={[{ name: 'Baptisés', value: stats.baptized }, { name: 'Non baptisés', value: stats.totalStudents - stats.baptized }]} /></CardContent></Card>
          </div>

          {/* === LISTE DES MEMBRES AVEC RECHERCHE, FILTRES ET PDF === */}
          <Card>
            <CardHeader className="px-4 py-3">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <CardTitle className="text-base">
                  Membres du service ({filteredMembers.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowMemberFilters(!showMemberFilters)} 
                    variant="outline" 
                    size="sm"
                  >
                    <FunnelIcon className="w-4 h-4 mr-1" />
                    {showMemberFilters ? 'Masquer' : 'Filtres'}
                  </Button>
                  <Button 
                    onClick={generateMembersPDF} 
                    size="sm" 
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                    PDF Membres
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2">
              {/* Barre de recherche */}
              <div className="mb-3 px-2">
                <input
                  type="text"
                  placeholder="🔍 Rechercher par nom..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Filtres avancés */}
              {showMemberFilters && (
                <div className="space-y-2 mb-3 p-3 bg-gray-50 rounded-lg mx-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Niveau</label>
                      <select
                        value={memberLevelFilter}
                        onChange={(e) => setMemberLevelFilter(e.target.value)}
                        className="w-full p-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="all">Tous</option>
                        <option value="1">Niveau 1</option>
                        <option value="2">Niveau 2</option>
                        <option value="3">Niveau 3</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Baptême</label>
                      <select
                        value={memberBaptismFilter}
                        onChange={(e) => setMemberBaptismFilter(e.target.value)}
                        className="w-full p-1 text-sm border border-gray-300 rounded"
                      >
                        <option value="all">Tous</option>
                        <option value="yes">Baptisés</option>
                        <option value="no">Non baptisés</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Filtre Maison de grâce (sélection) */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Maison de grâce</label>
                    <select
                      value={memberMaisonGraceFilter}
                      onChange={(e) => setMemberMaisonGraceFilter(e.target.value)}
                      className="w-full p-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="all">Toutes</option>
                      {maisonGraceList.map(maison => (
                        <option key={maison} value={maison}>{maison}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Recherche par maison de grâce (texte libre) */}
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Recherche maison de grâce</label>
                    <input
                      type="text"
                      placeholder="Ex: Abobo, Azito..."
                      value={memberMaisonGraceSearch}
                      onChange={(e) => setMemberMaisonGraceSearch(e.target.value)}
                      className="w-full p-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        setMemberSearchTerm('')
                        setMemberLevelFilter('all')
                        setMemberBaptismFilter('all')
                        setMemberMaisonGraceFilter('all')
                        setMemberMaisonGraceSearch('')
                      }}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Réinitialiser tous les filtres
                    </button>
                  </div>
                </div>
              )}

              {filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun membre trouvé
                </div>
              ) : (
                <>
                  {/* Version mobile */}
                  <div className="block lg:hidden space-y-3">
                    {filteredMembers.map(s => {
                      const member = serviceStats?.members.find(m => m.id === s.id) || { attendanceRate: 0, isActive: false }
                      return (
                        <div key={s.id} className="border rounded-lg p-3">
                          <div className="flex justify-between">
                            <span className="font-medium">{s.full_name}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${member.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {member.isActive ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 mt-2">
                            <div>Niveau {s.level}</div>
                            <div>Branche: {s.branch}</div>
                            <div>Baptême: {(s.baptized === true || String(s.baptized) === 'true') ? 'Oui' : 'Non'}</div>
                            <div>Tél: {s.phone || '-'}</div>
                            <div>Présence: {member.attendanceRate}%</div>
                            <div>@{s.username}</div>
                            {(s as any).maison_grace && (
                              <div className="col-span-2">🏠 {(s as any).maison_grace}</div>
                            )}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button variant="ghost" size="sm" className="flex-1 text-indigo-600" onClick={() => { setSelectedStudent(s); fetchStudentHistory(s.id); }}>Historique</Button>
                            <Button variant="ghost" size="sm" className="flex-1 text-red-600" onClick={() => handleDeleteStudent(s.id)}>Supprimer</Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Version desktop */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase">
                          <th className="py-2 px-2">Nom</th>
                          <th className="py-2 px-2">Username</th>
                          <th className="py-2 px-2">Niv.</th>
                          <th className="py-2 px-2">Branche</th>
                          <th className="py-2 px-2">Bapt.</th>
                          <th className="py-2 px-2">Maison</th>
                          <th className="py-2 px-2">Tél</th>
                          <th className="py-2 px-2">Présence</th>
                          <th className="py-2 px-2">Statut</th>
                          <th className="py-2 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map(s => {
                          const member = serviceStats?.members.find(m => m.id === s.id) || { attendanceRate: 0, isActive: false }
                          return (
                            <tr key={s.id} className="border-t hover:bg-gray-50">
                              <td className="py-2 px-2 text-sm font-medium">{s.full_name}</td>
                              <td className="py-2 px-2 text-xs text-gray-500">@{s.username}</td>
                              <td className="py-2 px-2 text-sm">{s.level}</td>
                              <td className="py-2 px-2 text-sm">{s.branch}</td>
                              <td className="py-2 px-2 text-sm">{(s.baptized === true || String(s.baptized) === 'true') ? 'Oui' : 'Non'}</td>
                              <td className="py-2 px-2 text-xs">{(s as any).maison_grace || '-'}</td>
                              <td className="py-2 px-2 text-sm">{s.phone || '-'}</td>
                              <td className="py-2 px-2 text-sm font-medium">
                                <span className={member.attendanceRate >= 70 ? 'text-green-600' : 'text-red-600'}>
                                  {member.attendanceRate}%
                                </span>
                              </td>
                              <td className="py-2 px-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${member.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {member.isActive ? 'Actif' : 'Inactif'}
                                </span>
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" className="text-indigo-600" onClick={() => { setSelectedStudent(s); fetchStudentHistory(s.id); }}>Historique</Button>
                                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteStudent(s.id)}>Supprimer</Button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal historique */}
      {showHistoryModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-auto p-4">
            <div className="flex justify-between items-center mb-3"><h2 className="font-bold">Historique de {selectedStudent.full_name}</h2><button onClick={() => setShowHistoryModal(false)}>✕</button></div>
            <div className="space-y-2">
              {studentHistory.length === 0 ? <p className="text-center text-gray-500">Aucune présence</p> : studentHistory.map(r => (
                <div key={r.id} className="border-b pb-2"><div className="font-medium">{new Date(r.date).toLocaleDateString('fr-FR')}</div><div className="flex justify-between"><span className={`text-sm ${r.status === 'present' ? 'text-green-600' : 'text-red-600'}`}>{r.status === 'present' ? 'Présent' : 'Absent'}</span><span className="text-xs text-gray-500">{r.scanned_at ? new Date(r.scanned_at).toLocaleTimeString() : '-'}</span></div></div>
              ))}
            </div>
          </div>
        </div>
      )}

      <AddStudentModal isOpen={showAddStudentModal} onClose={() => setShowAddStudentModal(false)} serviceId={user?.serviceId || ''} onStudentAdded={handleStudentAdded} />
    </div>
  )
}
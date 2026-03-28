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
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { ProfileSection } from '@/components/ProfileSection'
import { AddStudentModal } from '@/components/AddStudentModal'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

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
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [showSessionSelector, setShowSessionSelector] = useState(false)
  const [loadingService, setLoadingService] = useState(false)
  
  // États pour les filtres
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  const toggleProfile = () => {
    setShowProfile(!showProfile)
    setMobileMenuOpen(false)
  }

  const handleStudentAdded = () => {
    fetchData()
    fetchCurrentSession()
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
      console.log('📌 Chargement des données pour service:', user.serviceId)
      fetchServiceName()
      fetchData()
      fetchSessions()
      fetchCurrentSession()
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
          baptized: studentsData.filter(s => s.baptized).length,
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
      console.log('🔄 Récupération de toutes les sessions...')
      const res = await fetch('/api/service/session/current', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await res.json()
      console.log('📦 Réponse API:', data)
      
      if (res.ok) {
        setAllSessions(data.sessions || [])
        if (data.currentSession) {
          setServiceSession(data.currentSession)
          await fetchSessionStudents(data.currentSession.id)
        } else {
          setServiceSession(null)
          setServiceStudents([])
        }
      } else {
        console.error('❌ Erreur API:', data.error)
      }
    } catch (error) {
      console.error('❌ Erreur récupération sessions:', error)
    }
  }

  const fetchSessionStudents = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/service/session/current?sessionId=${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
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

  const startServiceSession = async () => {
    setLoadingService(true)
    try {
      console.log('🚀 Démarrage d\'une nouvelle session...')
      const res = await fetch('/api/service/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ date: new Date().toISOString().split('T')[0] })
      })
      const data = await res.json()
      console.log('📦 Réponse API session/start:', data)
      
      if (res.ok) {
        toast.success('Nouvelle session démarrée')
        fetchCurrentSession()
      } else {
        toast.error(data.error || 'Erreur lors du démarrage')
      }
    } catch (error) {
      console.error('❌ Erreur démarrage session:', error)
      toast.error('Erreur lors du démarrage')
    } finally {
      setLoadingService(false)
    }
  }

  const changeSession = (sessionId: string) => {
    setSelectedSessionId(sessionId)
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

      console.log('💾 Enregistrement des présences:', attendances)
      
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
      console.log('📦 Réponse API attendance/mark:', data)
      
      if (res.ok) {
        toast.success('Présences enregistrées')
        fetchCurrentSession()
      } else {
        toast.error(data.error || 'Erreur')
      }
    } catch (error) {
      console.error('❌ Erreur enregistrement:', error)
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
      toast.error('Veuillez sélectionner une séance académique');
      return;
    }

    try {
      const session = sessions.find(s => s.id === selectedSession);
      if (!session) return;

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
        .eq('session_id', selectedSession);

      const attendanceData = attendanceDetails?.map(a => ({
        student: a.students,
        status: a.status,
        scanned_at: a.scanned_at
      })) || [];

      const sessionDate = new Date(session.date).toLocaleDateString('fr-FR');

      generateAttendancePDF(
        session.code,
        sessionDate,
        students,
        attendanceData,
        serviceName,
        type
      );

      const typeText = type === 'present' ? 'des présents' : type === 'absent' ? 'des absents' : 'complet';
      toast.success(`PDF académique ${typeText} généré avec succès`);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  }

  const generateServicePDF = async (type: 'all' | 'present' | 'absent') => {
    if (!serviceSession) {
      toast.error('Aucune session service active');
      return;
    }

    try {
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.text('Académie de la Grâce', 105, 15, { align: 'center' });
      doc.setFontSize(16);
      doc.text('Rapport de présence service', 105, 25, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Service: ${serviceName}`, 105, 35, { align: 'center' });
      doc.text(`Date: ${new Date(serviceSession.date).toLocaleDateString('fr-FR')}`, 105, 42, { align: 'center' });
      
      const total = serviceStudents.length;
      const present = serviceStudents.filter(s => s.status === 'present').length;
      const absent = serviceStudents.filter(s => s.status === 'absent').length;
      const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;
      
      doc.setFontSize(11);
      doc.text(`Total étudiants: ${total}`, 20, 55);
      doc.text(`Présents: ${present}`, 20, 62);
      doc.text(`Absents: ${absent}`, 20, 69);
      doc.text(`Taux de présence: ${attendanceRate}%`, 20, 76);
      
      const now = new Date();
      doc.setFontSize(8);
      doc.text(`Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`, 105, 280, { align: 'center' });
      
      let filteredStudents = serviceStudents;
      if (type === 'present') {
        filteredStudents = serviceStudents.filter(s => s.status === 'present');
      } else if (type === 'absent') {
        filteredStudents = serviceStudents.filter(s => s.status === 'absent');
      }
      
      const tableData = filteredStudents.map(student => [
        student.name,
        student.status === 'present' ? '✓ Présent' : '✗ Absent'
      ]);
      
      autoTable(doc, {
        head: [['Nom', 'Statut']],
        body: tableData,
        startY: 85,
        styles: { fontSize: 10 },
        headStyles: { fillColor: type === 'present' ? [16, 185, 129] : type === 'absent' ? [239, 68, 68] : [79, 70, 229] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 40 } }
      });
      
      const fileName = `presence_service_${serviceName}_${new Date(serviceSession.date).toISOString().split('T')[0]}_${type}.pdf`;
      doc.save(fileName);
      
      const typeText = type === 'present' ? 'des présents' : type === 'absent' ? 'des absents' : 'complet';
      toast.success(`PDF service ${typeText} généré avec succès`);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const filteredServiceStudents = serviceStudents.filter(student => {
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter
    const matchesSearch = searchTerm === '' || student.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const presentCount = serviceStudents.filter(s => s.status === 'present').length
  const absentCount = serviceStudents.filter(s => s.status === 'absent').length
  const attendanceRate = serviceStudents.length > 0 ? Math.round((presentCount / serviceStudents.length) * 100) : 0

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

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center flex-1 lg:flex-none">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
              <h1 className="text-lg sm:text-xl font-semibold ml-2 lg:ml-0 truncate">
                {showProfile ? 'Mon profil' : `Dashboard - ${user.name}`}
              </h1>
              {!showProfile && serviceName && (
                <span className="hidden lg:inline ml-3 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                  {serviceName}
                </span>
              )}
            </div>

            <div className="hidden lg:flex items-center space-x-4">
              {!showProfile && (
                <Button
                  onClick={() => setShowAddStudentModal(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <UserPlusIcon className="w-4 h-4" />
                  Ajouter un étudiant
                </Button>
              )}
              <Button
                onClick={toggleProfile}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <UserCircleIcon className="w-4 h-4" />
                {showProfile ? 'Tableau de bord' : 'Mon profil'}
              </Button>
              <Button onClick={logout} variant="destructive" size="sm">
                Déconnexion
              </Button>
            </div>

            <div className="flex items-center lg:hidden">
              <button
                onClick={logout}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Déconnexion"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>

          {!showProfile && serviceName && (
            <div className="lg:hidden pb-2">
              <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                {serviceName}
              </span>
            </div>
          )}
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-2">
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
                onClick={toggleProfile}
                className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
              >
                <UserCircleIcon className="w-5 h-5 mr-3" />
                {showProfile ? 'Tableau de bord' : 'Mon profil'}
              </button>
            </div>
          </div>
        )}
      </nav>

      {!showProfile && serviceName && (
        <div className="lg:hidden px-4 py-2 bg-indigo-50 border-b border-indigo-100">
          <p className="text-xs text-indigo-600">
            <span className="font-medium">Service:</span> {serviceName}
          </p>
        </div>
      )}

      {showProfile ? (
        <ProfileSection user={user} onClose={() => setShowProfile(false)} />
      ) : (
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          {/* Section Présence Service (Checkbox) */}
          <Card className="mb-8">
            <CardHeader className="px-4 sm:px-6 py-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-indigo-600" />
                  📋 Présence Service - {serviceName}
                </CardTitle>
                <Button
                  onClick={startServiceSession}
                  disabled={loadingService}
                  variant="outline"
                  size="sm"
                  className="border-green-500 text-green-600 hover:bg-green-50"
                >
                  + Nouvelle session
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
              {allSessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Aucune session créée</p>
                  <p className="text-sm text-gray-400">Cliquez sur "Nouvelle session" pour commencer</p>
                </div>
              ) : (
                <div>
                  {allSessions.length > 1 && (
                    <div className="relative mb-4">
                      <button
                        onClick={() => setShowSessionSelector(!showSessionSelector)}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                      >
                        <CalendarIcon className="w-4 h-4" />
                        Session du {serviceSession ? new Date(serviceSession.date).toLocaleDateString('fr-FR') : 'Choisir une session'}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {showSessionSelector && (
                        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                          {allSessions.map(session => (
                            <button
                              key={session.id}
                              onClick={() => changeSession(session.id)}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex justify-between items-center ${
                                serviceSession?.id === session.id ? 'bg-indigo-50 text-indigo-600' : ''
                              }`}
                            >
                              <span>Session du {new Date(session.date).toLocaleDateString('fr-FR')}</span>
                              <span className="text-xs text-gray-500">
                                {session.stats?.present || 0}/{session.stats?.total || 0}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {serviceSession && (
                    <div>
                      <div className="mb-4 flex justify-between items-center">
                        <p className="text-sm text-gray-500">
                          Session du {new Date(serviceSession.date).toLocaleDateString('fr-FR')} à {new Date(serviceSession.created_at).toLocaleTimeString()}
                        </p>
                        <Button
                          onClick={saveAttendances}
                          disabled={loadingService}
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          Enregistrer
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <div className="text-xl font-bold text-gray-700">{serviceStudents.length}</div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                          <div className="text-xl font-bold text-green-600">{presentCount}</div>
                          <div className="text-xs text-gray-500">Présents</div>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg text-center">
                          <div className="text-xl font-bold text-red-600">{absentCount}</div>
                          <div className="text-xs text-gray-500">Absents</div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Taux de présence</span>
                          <span>{attendanceRate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${attendanceRate}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Rechercher un étudiant..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                              <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setStatusFilter('all')}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                statusFilter === 'all'
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Tous ({serviceStudents.length})
                            </button>
                            <button
                              onClick={() => setStatusFilter('present')}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                statusFilter === 'present'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Présents ({presentCount})
                            </button>
                            <button
                              onClick={() => setStatusFilter('absent')}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                statusFilter === 'absent'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              Absents ({absentCount})
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-2">
                        {filteredServiceStudents.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            Aucun étudiant trouvé
                          </div>
                        ) : (
                          filteredServiceStudents.map(student => (
                            <div
                              key={student.id}
                              onClick={() => togglePresence(student.id)}
                              className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors ${
                                student.status === 'present'
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  student.status === 'present' ? 'bg-green-500' : 'bg-red-500'
                                }`} />
                                <span className="font-medium text-sm sm:text-base">{student.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={student.status === 'present'}
                                  onChange={() => togglePresence(student.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                />
                                <span className={`text-xs sm:text-sm ${student.status === 'present' ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                  {student.status === 'present' ? 'Présent' : 'Absent'}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message d'information sur les codes académiques */}
          <Card className="mb-8 bg-blue-50 border-blue-200">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className="text-2xl sm:text-3xl flex-shrink-0">🎓</div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-blue-800">Présence Académique</h3>
                  <p className="text-xs sm:text-sm text-blue-600 mt-1">
                    Les codes de présence académique sont générés par l'administrateur. 
                    Les étudiants entrent ces codes pour valider leur présence aux cours.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-4 sm:mb-8">
            <Card className="card-hover">
              <CardContent className="p-4 sm:pt-6">
                <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Étudiants</div>
                <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-gray-900">{stats.totalStudents}</div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="p-4 sm:pt-6">
                <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Présents service</div>
                <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-green-600">{presentCount}</div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="p-4 sm:pt-6">
                <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Baptisés</div>
                <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-blue-600">{stats.baptized}</div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="p-4 sm:pt-6">
                <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Progression</div>
                <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-purple-600">{stats.averageProgress}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Sélecteur de session académique */}
          <Card className="mb-8">
            <CardHeader className="px-4 sm:px-6 py-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <CardTitle className="text-base sm:text-lg">Historique Présences Académiques</CardTitle>
                {selectedSession !== 'today' && selectedSession !== 'all' && attendanceBySession.length > 0 && (
                  <div className="flex gap-2">
                    <Button onClick={() => generateAcademicPDF('all')} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">📄 PDF complet</Button>
                    <Button onClick={() => generateAcademicPDF('present')} size="sm" className="bg-green-600 hover:bg-green-700 text-white">✅ PDF présents</Button>
                    <Button onClick={() => generateAcademicPDF('absent')} size="sm" className="bg-red-600 hover:bg-red-700 text-white">❌ PDF absents</Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
              <div className="space-y-4">
                <select
                  value={selectedSession}
                  onChange={(e) => {
                    setSelectedSession(e.target.value)
                    fetchAttendanceBySession(e.target.value)
                  }}
                  className="w-full p-2 sm:p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="today">Aujourd'hui</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {new Date(session.date).toLocaleDateString('fr-FR')} - Code: {session.code}
                    </option>
                  ))}
                </select>

                {selectedSession !== 'today' && (
                  <>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                      <div className="bg-green-50 p-2 sm:p-4 rounded-lg text-center">
                        <div className="text-lg sm:text-2xl font-bold text-green-600">
                          {attendanceBySession.filter(a => a.status === 'present').length}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Présents</div>
                      </div>
                      <div className="bg-red-50 p-2 sm:p-4 rounded-lg text-center">
                        <div className="text-lg sm:text-2xl font-bold text-red-600">
                          {attendanceBySession.filter(a => a.status === 'absent').length}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Absents</div>
                      </div>
                      <div className="bg-yellow-50 p-2 sm:p-4 rounded-lg text-center">
                        <div className="text-lg sm:text-2xl font-bold text-yellow-600">
                          {attendanceBySession.filter(a => a.status === 'late').length}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">Retards</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm sm:text-base font-medium mb-2">Détail :</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                        {students.map(student => {
                          const attendance = attendanceBySession.find(a => a.student_id === student.id)
                          return (
                            <div key={student.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm font-medium">{student.full_name}</span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                attendance ? 
                                  attendance.status === 'present' ? 'bg-green-100 text-green-800' :
                                  attendance.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                : 'bg-red-100 text-red-800'
                              }`}>
                                {attendance ? 
                                  attendance.status === 'present' ? '✓ Présent' :
                                  attendance.status === 'late' ? '⚠ Retard' : '✗ Absent'
                                : '✗ Absent'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-4 sm:mb-8">
            <Card>
              <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="text-base sm:text-lg">Présences par mois</CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <AttendanceChart data={[
                  { month: 'Jan', presents: 65 },
                  { month: 'Fév', presents: 59 },
                  { month: 'Mar', presents: 80 },
                  { month: 'Avr', presents: 81 },
                  { month: 'Mai', presents: 56 },
                  { month: 'Juin', presents: 55 },
                ]} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="text-base sm:text-lg">Répartition Baptême</CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <CustomPieChart data={[
                  { name: 'Baptisés', value: stats.baptized },
                  { name: 'Non baptisés', value: stats.totalStudents - stats.baptized }
                ]} />
              </CardContent>
            </Card>
          </div>

          {/* Liste des étudiants */}
          <Card>
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-base sm:text-lg">Membres du service</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="block lg:hidden space-y-3">
                {students.map((student) => {
                  const todayAttendance = attendance.find(a => a.student_id === student.id)
                  return (
                    <div key={student.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{student.full_name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          todayAttendance?.status === 'present' ? 'bg-green-100 text-green-800' :
                          todayAttendance?.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {todayAttendance?.status === 'present' ? 'Présent' :
                           todayAttendance?.status === 'late' ? 'Retard' : 'Absent'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                        <div>Niveau {student.level}</div>
                        <div>Branche: {student.branch}</div>
                        <div>Baptême: {student.baptized ? 'Oui' : 'Non'}</div>
                        <div>Tél: {student.phone || '-'}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedStudent(student)
                          fetchStudentHistory(student.id)
                        }}
                        className="w-full text-indigo-600 hover:text-indigo-700 text-sm"
                      >
                        Voir historique
                      </Button>
                    </div>
                  )
                })}
              </div>
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Niveau</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branche</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Baptême</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Présence</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => {
                      const todayAttendance = attendance.find(a => a.student_id === student.id)
                      return (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {student.full_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            Niveau {student.level}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.branch}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              student.baptized ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {student.baptized ? 'Oui' : 'Non'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              todayAttendance?.status === 'present' ? 'bg-green-100 text-green-800' :
                              todayAttendance?.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {todayAttendance?.status === 'present' ? 'Présent' :
                               todayAttendance?.status === 'late' ? 'Retard' : 'Absent'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedStudent(student)
                                fetchStudentHistory(student.id)
                              }}
                            >
                              Historique
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modals */}
      {showHistoryModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold truncate pr-4">Historique de {selectedStudent.full_name}</h2>
              <button
                onClick={() => {
                  setShowHistoryModal(false)
                  setSelectedStudent(null)
                  setStudentHistory([])
                }}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {studentHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucun historique de présence</p>
              ) : (
                studentHistory.map((record) => (
                  <div key={record.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 rounded gap-2">
                    <div>
                      <p className="font-medium text-sm sm:text-base">
                        {new Date(record.date).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        Code: {record.sessions?.code || '-'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        record.status === 'present' ? 'bg-green-100 text-green-800' :
                        record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.status === 'present' ? 'Présent' :
                         record.status === 'late' ? 'Retard' : 'Absent'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {record.scanned_at ? new Date(record.scanned_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <AddStudentModal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        serviceId={user?.serviceId || ''}
        onStudentAdded={handleStudentAdded}
      />
    </div>
  )
}
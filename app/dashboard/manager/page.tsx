'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AttendanceChart, CustomPieChart } from '@/components/charts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Student, Attendance } from '@/types'
import { generateAttendancePDF } from '@/lib/pdf-generator'
import { UserCircleIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { ProfileSection } from '@/components/ProfileSection'
import { AddStudentModal } from '@/components/AddStudentModal'

export default function ManagerDashboard() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [showProfile, setShowProfile] = useState(false)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('today')
  const [attendanceBySession, setAttendanceBySession] = useState<any[]>([])
  const [sessionStudents, setSessionStudents] = useState<Student[]>([])
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

  const toggleProfile = () => {
    setShowProfile(!showProfile)
  }

  const handleStudentAdded = () => {
    fetchData()
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
        setSessionStudents(studentsData)
        
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

      setSessionStudents(students)
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

  const generatePDF = async (type: 'all' | 'present' | 'absent') => {
    if (selectedSession === 'today') {
      toast.error('Veuillez sélectionner une séance passée');
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
      toast.success(`PDF ${typeText} généré avec succès`);
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  if (loading || loadingData) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">
                {showProfile ? 'Mon profil' : `Dashboard - ${user.name}`}
              </h1>
              {!showProfile && (
                <span className="ml-3 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                  {serviceName}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
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
              <Button onClick={logout} variant="destructive">
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {showProfile ? (
        <ProfileSection user={user} onClose={() => setShowProfile(false)} />
      ) : (
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Message d'information sur les codes */}
          <Card className="mb-8 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">🔑</div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-800">Codes de présence (5 minutes)</h3>
                  <p className="text-blue-600">
                    Les codes de présence sont générés uniquement par l'administrateur et sont valables 5 minutes.
                    Passé ce délai, les étudiants n'ayant pas scanné seront automatiquement marqués absents.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Total Étudiants</div>
                <div className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalStudents}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Présents aujourd'hui</div>
                <div className="mt-2 text-3xl font-semibold text-green-600">{stats.presentToday}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Baptisés</div>
                <div className="mt-2 text-3xl font-semibold text-blue-600">{stats.baptized}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm font-medium text-gray-500">Progression moyenne</div>
                <div className="mt-2 text-3xl font-semibold text-purple-600">{stats.averageProgress}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Sélecteur de session avec visualisation des présences */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Présences par séance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <select
                  value={selectedSession}
                  onChange={(e) => {
                    setSelectedSession(e.target.value)
                    fetchAttendanceBySession(e.target.value)
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md"
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
                    {/* Statistiques de la séance */}
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="bg-green-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {attendanceBySession.filter(a => a.status === 'present').length}
                        </div>
                        <div className="text-sm text-gray-600">Présents</div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {attendanceBySession.filter(a => a.status === 'absent').length}
                        </div>
                        <div className="text-sm text-gray-600">Absents</div>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {attendanceBySession.filter(a => a.status === 'late').length}
                        </div>
                        <div className="text-sm text-gray-600">Retards</div>
                      </div>
                    </div>

                    {/* Liste détaillée des présences */}
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Détail des présences :</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                        {students.map(student => {
                          const attendance = attendanceBySession.find(a => a.student_id === student.id)
                          return (
                            <div key={student.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="font-medium">{student.full_name}</span>
                              <span className={`px-2 py-1 rounded text-sm ${
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

                    {/* Options PDF */}
                    <div className="flex flex-col space-y-2 mt-4">
                      <Button
                        onClick={() => generatePDF('all')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                        size="lg"
                      >
                        📄 Rapport complet
                      </Button>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => generatePDF('present')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          size="lg"
                        >
                          ✅ Présents uniquement
                        </Button>
                        
                        <Button
                          onClick={() => generatePDF('absent')}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          size="lg"
                        >
                          ❌ Absents uniquement
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Présences par mois</CardTitle>
              </CardHeader>
              <CardContent>
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
              <CardHeader>
                <CardTitle>Répartition Baptême</CardTitle>
              </CardHeader>
              <CardContent>
                <CustomPieChart data={[
                  { name: 'Baptisés', value: stats.baptized },
                  { name: 'Non baptisés', value: stats.totalStudents - stats.baptized }
                ]} />
              </CardContent>
            </Card>
          </div>

          {/* Liste des étudiants */}
          <Card>
            <CardHeader>
              <CardTitle>Membres du service</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Niveau</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branche</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Baptême</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Présence</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => {
                      const todayAttendance = attendance.find(a => a.student_id === student.id)
                      return (
                        <tr key={student.id}>
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
                              todayAttendance?.status === 'present' 
                                ? 'bg-green-100 text-green-800'
                                : todayAttendance?.status === 'late'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {todayAttendance?.status === 'present' 
                                ? 'Présent' 
                                : todayAttendance?.status === 'late'
                                ? 'En retard'
                                : 'Absent'}
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

      {/* Modal Historique Étudiant */}
      {showHistoryModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Historique de {selectedStudent.full_name}</h2>
              <button
                onClick={() => {
                  setShowHistoryModal(false)
                  setSelectedStudent(null)
                  setStudentHistory([])
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2">
              {studentHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucun historique de présence</p>
              ) : (
                studentHistory.map((record) => (
                  <div key={record.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">
                        {new Date(record.date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-gray-500">
                        Code: {record.sessions?.code || '-'} - Scanné à: {record.scanned_at ? new Date(record.scanned_at).toLocaleTimeString('fr-FR') : '-'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      record.status === 'present' 
                        ? 'bg-green-100 text-green-800'
                        : record.status === 'late'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {record.status === 'present' ? 'Présent' : record.status === 'late' ? 'En retard' : 'Absent'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal d'ajout d'étudiant */}
      <AddStudentModal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        serviceId={user?.serviceId || ''}
        onStudentAdded={handleStudentAdded}
      />
    </div>
  )
}
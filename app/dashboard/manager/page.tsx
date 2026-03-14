'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AttendanceChart, CustomPieChart, ProgressChart } from '@/components/charts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Student, Attendance } from '@/types'

export default function ManagerDashboard() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    baptized: 0,
    averageProgress: 0
  })
  const [loadingData, setLoadingData] = useState(true)

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
      fetchData()
    }
  }, [user, loading])

  const fetchData = async () => {
    setLoadingData(true)
    try {
      // Récupérer les étudiants du service
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('service_id', user?.serviceId)

      if (studentsError) throw studentsError

      if (studentsData) {
        setStudents(studentsData)
        
        // Récupérer les présences d'aujourd'hui
        const today = new Date().toISOString().split('T')[0]
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('date', today)
          .in('student_id', studentsData.map(s => s.id))

        if (attendanceError) throw attendanceError

        if (attendanceData) {
          setAttendance(attendanceData)
        }

        // Récupérer les progressions
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

  const generateQRCode = async () => {
    try {
      const res = await fetch('/api/qrcode/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          serviceId: user?.serviceId
        })
      })

      const data = await res.json()
      
      if (res.ok) {
        // Ouvrir le QR code dans une nouvelle fenêtre
        const qrWindow = window.open('', '_blank')
        if (qrWindow) {
          qrWindow.document.write(`
            <html>
              <head>
                <title>QR Code - Session</title>
                <style>
                  body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f3f4f6; }
                  .container { text-align: center; background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                  img { max-width: 300px; height: auto; }
                  p { margin-top: 1rem; color: #4b5563; }
                </style>
              </head>
              <body>
                <div class="container">
                  <img src="${data.qrCode}" alt="QR Code" />
                  <p>Valable jusqu'à: ${new Date(data.expiresAt).toLocaleString('fr-FR')}</p>
                </div>
              </body>
            </html>
          `)
          qrWindow.document.close()
        }
        toast.success('QR code généré avec succès')
      } else {
        toast.error(data.error || 'Erreur lors de la génération')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la génération du QR code')
    }
  }

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
              <h1 className="text-xl font-semibold">Dashboard - {user.name}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Service Manager</span>
              <Button onClick={logout} variant="destructive">
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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

        {/* Actions rapides */}
        <div className="mb-8">
          <Button onClick={generateQRCode} size="lg">
            Générer QR Code pour aujourd'hui
          </Button>
        </div>

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
                          <Button variant="ghost" size="sm">
                            Détails
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
    </div>
  )
}
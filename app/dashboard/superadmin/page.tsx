'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AttendanceChart, CustomPieChart, ProgressChart } from '@/components/charts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Service, Student } from '@/types'

export default function SuperAdminDashboard() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalServices: 0,
    presentToday: 0,
    baptized: 0,
    averageProgress: 0
  })
  const [loadingData, setLoadingData] = useState(true)
  const [selectedService, setSelectedService] = useState<string>('all')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    if (user?.role === 'student') {
      router.push('/dashboard/student')
    }
    if (user?.role === 'service_manager') {
      router.push('/dashboard/manager')
    }
    if (user?.role === 'superadmin') {
      fetchData()
    }
  }, [user, loading])

  const fetchData = async () => {
    setLoadingData(true)
    try {
      // Récupérer tous les services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .order('name')

      if (servicesData) {
        setServices(servicesData)
      }

      // Récupérer tous les étudiants
      const { data: studentsData } = await supabase
        .from('students')
        .select('*')

      if (studentsData) {
        setStudents(studentsData)
      }

      // Récupérer les présences d'aujourd'hui
      const today = new Date().toISOString().split('T')[0]
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*, students(*)')
        .eq('date', today)

      // Récupérer les progressions
      const { data: progressData } = await supabase
        .from('progress')
        .select('*')

      const avgProgress = progressData?.length 
        ? progressData.reduce((acc, p) => acc + (p.score || 0), 0) / progressData.length 
        : 0

      setStats({
        totalStudents: studentsData?.length || 0,
        totalServices: servicesData?.length || 0,
        presentToday: attendanceData?.filter(a => a.status === 'present').length || 0,
        baptized: studentsData?.filter(s => s.baptized).length || 0,
        averageProgress: Math.round(avgProgress)
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoadingData(false)
    }
  }

  const getStudentsByService = (serviceId: string) => {
    if (serviceId === 'all') return students
    return students.filter(s => s.service_id === serviceId)
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
              <h1 className="text-xl font-semibold">Dashboard Super Admin - {user.name}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={logout} variant="destructive">
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Statistiques globales */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500">Total Étudiants</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalStudents}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500">Total Services</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{stats.totalServices}</div>
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

        {/* Filtre par service */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrer par service
          </label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="all">Tous les services</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Présences par service</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceChart data={services.slice(0, 6).map(s => ({
                month: s.name.substring(0, 10),
                presents: Math.floor(Math.random() * 50) + 20
              }))} />
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

        {/* Liste des étudiants par service */}
        <Card>
          <CardHeader>
            <CardTitle>Étudiants {selectedService !== 'all' ? `- ${services.find(s => s.id === selectedService)?.name}` : ''}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Niveau</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branche</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Baptême</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getStudentsByService(selectedService).map((student) => {
                    const studentService = services.find(s => s.id === student.service_id)
                    return (
                      <tr key={student.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {studentService?.name || 'N/A'}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.phone}
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
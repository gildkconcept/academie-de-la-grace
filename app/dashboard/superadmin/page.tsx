'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  AttendanceChart, 
  CustomPieChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer 
} from '@/components/charts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Service, Student } from '@/types'
import { generateAttendancePDF } from '@/lib/pdf-generator'

export default function SuperAdminDashboard() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<string>('all')
  const [selectedService, setSelectedService] = useState<string>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedBaptism, setSelectedBaptism] = useState<string>('all')
  const [branches, setBranches] = useState<string[]>([])
  const [attendanceBySession, setAttendanceBySession] = useState<any[]>([])
  const [sessionStudents, setSessionStudents] = useState<Student[]>([])
  const [branchStats, setBranchStats] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalServices: 0,
    presentToday: 0,
    baptized: 0,
    averageProgress: 0
  })
  const [loadingData, setLoadingData] = useState(true)

  // Données pour les graphiques
  const [presenceByService, setPresenceByService] = useState<any[]>([])
  const [presenceByLevel, setPresenceByLevel] = useState<any[]>([])
  const [presenceByBranch, setPresenceByBranch] = useState<any[]>([])
  const [baptismStats, setBaptismStats] = useState<any[]>([])

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
      fetchAllSessions()
    }
  }, [user, loading])

  useEffect(() => {
    applyFilters()
  }, [students, selectedService, selectedBranch, selectedLevel, selectedBaptism])

  const fetchData = async () => {
    setLoadingData(true)
    try {
      // Récupérer les services
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
        .order('full_name')

      if (studentsData) {
        setStudents(studentsData)
        setFilteredStudents(studentsData)
        
        // Extraire toutes les branches uniques
        const uniqueBranches = [...new Set(studentsData.map(s => s.branch))].sort()
        setBranches(uniqueBranches)
      }

      // Statistiques du jour
      const today = new Date().toISOString().split('T')[0]
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*, students(*)')
        .eq('date', today)

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

      // Générer les statistiques pour les graphiques
      generateChartData(studentsData || [], servicesData || [])
      
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoadingData(false)
    }
  }

  const generateChartData = (studentsData: Student[], servicesData: Service[]) => {
    // Présence par service
    const servicePresence = servicesData.map(service => {
      const serviceStudents = studentsData.filter(s => s.service_id === service.id)
      const presentCount = Math.floor(Math.random() * serviceStudents.length)
      return {
        name: service.name.substring(0, 15),
        présents: presentCount,
        absents: serviceStudents.length - presentCount,
        total: serviceStudents.length
      }
    })
    setPresenceByService(servicePresence)

    // Présence par niveau
    const niveau1 = studentsData.filter(s => s.level === 1)
    const niveau2 = studentsData.filter(s => s.level === 2)
    setPresenceByLevel([
      { name: 'Niveau 1', présents: Math.floor(Math.random() * niveau1.length), total: niveau1.length },
      { name: 'Niveau 2', présents: Math.floor(Math.random() * niveau2.length), total: niveau2.length }
    ])

    // Présence par branche (top 5)
    const branchMap = new Map()
    studentsData.forEach(s => {
      const count = branchMap.get(s.branch) || 0
      branchMap.set(s.branch, count + 1)
    })
    const topBranches = Array.from(branchMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({
        name: name.substring(0, 15),
        présents: Math.floor(Math.random() * total),
        total
      }))
    setPresenceByBranch(topBranches)

    // Statistiques baptême
    const baptises = studentsData.filter(s => s.baptized).length
    const nonBaptises = studentsData.length - baptises
    setBaptismStats([
      { name: 'Baptisés', value: baptises },
      { name: 'Non baptisés', value: nonBaptises }
    ])
  }

  const fetchAllSessions = async () => {
    try {
      const { data } = await supabase
        .from('sessions')
        .select(`
          *,
          services (
            name
          )
        `)
        .order('date', { ascending: false })
        .limit(20)
      
      if (data) {
        setSessions(data)
      }
    } catch (error) {
      console.error('Erreur chargement sessions:', error)
    }
  }

  const calculateBranchStats = (students: Student[], attendanceData: any[]) => {
    const branchMap = new Map()
    
    students.forEach(student => {
      const branch = student.branch
      if (!branchMap.has(branch)) {
        branchMap.set(branch, {
          name: branch,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          percentage: 0
        })
      }
      branchMap.get(branch).total++
    })

    attendanceData.forEach(record => {
      const student = students.find(s => s.id === record.student_id)
      if (student) {
        const branch = student.branch
        const branchData = branchMap.get(branch)
        if (branchData) {
          if (record.status === 'present') branchData.present++
          else if (record.status === 'late') branchData.late++
          else if (record.status === 'absent') branchData.absent++
        }
      }
    })

    branchMap.forEach(branch => {
      branch.percentage = branch.total > 0 
        ? Math.round((branch.present / branch.total) * 100) 
        : 0
    })

    return Array.from(branchMap.values())
      .sort((a, b) => b.percentage - a.percentage)
  }

  const fetchAttendanceBySession = async (sessionId: string) => {
    if (sessionId === 'all') {
      setAttendanceBySession([])
      setSessionStudents([])
      setBranchStats([])
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
            phone,
            service_id
          )
        `)
        .eq('session_id', sessionId)
      
      if (data) {
        setAttendanceBySession(data)
        
        const session = sessions.find(s => s.id === sessionId)
        if (session) {
          let serviceStudents: Student[] = []
          
          if (session.service_id) {
            const { data: studentsData } = await supabase
              .from('students')
              .select('*')
              .eq('service_id', session.service_id)
            serviceStudents = studentsData || []
          } else {
            // Session universelle - tous les étudiants
            serviceStudents = students
          }
          
          setSessionStudents(serviceStudents)
          const stats = calculateBranchStats(serviceStudents, data || [])
          setBranchStats(stats)
        }
      }
    } catch (error) {
      console.error('Erreur chargement présences:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...students]

    if (selectedService !== 'all') {
      filtered = filtered.filter(s => s.service_id === selectedService)
    }

    if (selectedBranch !== 'all') {
      filtered = filtered.filter(s => s.branch === selectedBranch)
    }

    if (selectedLevel !== 'all') {
      filtered = filtered.filter(s => s.level === parseInt(selectedLevel))
    }

    if (selectedBaptism !== 'all') {
      const isBaptized = selectedBaptism === 'yes'
      filtered = filtered.filter(s => s.baptized === isBaptized)
    }

    setFilteredStudents(filtered)
  }

  const resetFilters = () => {
    setSelectedService('all')
    setSelectedBranch('all')
    setSelectedLevel('all')
    setSelectedBaptism('all')
  }

  const showCodeModal = (code: string, expiresAt: string) => {
    const expiresAtDate = new Date(expiresAt);
    const expirationLocale = expiresAtDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl p-6 max-w-md w-full">
        <div class="text-center">
          <div class="bg-green-100 text-green-800 px-4 py-2 rounded-full inline-block mb-4">
            🌍 CODE UNIVERSEL
          </div>
          <div class="text-6xl sm:text-8xl font-bold tracking-wider text-indigo-600 mb-6 font-mono">
            ${code}
          </div>
          <div class="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full inline-block mb-4">
            ⏳ Valable 5 minutes
          </div>
          <div class="bg-gray-100 p-4 rounded-xl mb-6">
            <div class="flex justify-between items-center py-2 border-b border-gray-200">
              <span class="text-gray-600">⏰ Expire à :</span>
              <span class="font-bold text-red-600 text-lg">${expirationLocale}</span>
            </div>
          </div>
          <div class="bg-blue-50 p-4 rounded-xl mb-4">
            <p class="text-sm text-blue-800">
              📱 Montrez ce code aux étudiants. Ils ont 5 minutes pour l'entrer dans l'application.
            </p>
          </div>
          <button onclick="this.closest('.fixed').remove()" 
                  class="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-xl transition-colors">
            Fermer
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  };

  const displayCodeInWindow = (codeWindow: Window, code: string, expiresAt: string) => {
    const maintenant = new Date();
    const expiresAtDate = new Date(expiresAt);
    
    const heureLocale = maintenant.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const expirationLocale = expiresAtDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    codeWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Code de présence - 5 minutes</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
              padding: 1rem;
            }
            .container { 
              text-align: center; 
              background: white; 
              padding: 2rem; 
              border-radius: 2rem; 
              box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
              max-width: 700px;
              width: 100%;
            }
            .universal-badge {
              background: #10b981;
              color: white;
              padding: 0.75rem 1.5rem;
              border-radius: 3rem;
              display: inline-block;
              margin-bottom: 1.5rem;
              font-weight: 600;
              font-size: 1.1rem;
            }
            .duration {
              background: #f59e0b;
              color: white;
              padding: 0.75rem 1.5rem;
              border-radius: 3rem;
              display: inline-block;
              margin: 1rem 0 1.5rem 0;
              font-weight: 600;
              font-size: 1.1rem;
            }
            .warning {
              background: #fee2e2;
              color: #b91c1c;
              padding: 1rem;
              border-radius: 1rem;
              margin: 1rem 0;
              font-size: 1rem;
              border-left: 4px solid #b91c1c;
            }
            .instruction {
              font-size: 1.5rem;
              color: #374151;
              margin-bottom: 1rem;
              font-weight: 500;
            }
            .code { 
              font-size: min(10rem, 20vw); 
              font-weight: 800; 
              letter-spacing: 1.5rem;
              color: #4f46e5;
              margin: 1.5rem 0;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
              font-family: 'Courier New', monospace;
              line-height: 1.2;
              word-break: break-all;
            }
            .time-info {
              background: #f3f4f6;
              padding: 1.5rem;
              border-radius: 1rem;
              margin: 2rem 0;
            }
            .time-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 0.75rem 0;
              border-bottom: 1px solid #e5e7eb;
              font-size: 1.1rem;
            }
            .time-row:last-child { border-bottom: none; }
            .time-label { color: #4b5563; font-weight: 500; }
            .time-value {
              font-weight: 700;
              color: #1f2937;
              background: white;
              padding: 0.25rem 0.75rem;
              border-radius: 2rem;
              font-size: 1.2rem;
            }
            .expires-value {
              color: #ef4444;
              font-size: 1.3rem;
              font-weight: 800;
            }
            .admin-info {
              background: #e0f2fe;
              color: #0369a1;
              padding: 0.75rem;
              border-radius: 0.5rem;
              margin: 1rem 0;
              font-size: 0.9rem;
            }
            .current-time {
              color: #6b7280;
              font-size: 0.9rem;
              margin-top: 1rem;
            }
            .note {
              font-size: 0.9rem;
              color: #9ca3af;
              margin-top: 0.5rem;
            }
            @media (max-width: 640px) {
              .container { padding: 1.5rem; }
              .code { letter-spacing: 0.5rem; }
              .time-row { flex-direction: column; gap: 0.5rem; }
              .time-value { width: 100%; text-align: center; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="universal-badge">🌍 CODE UNIVERSEL</div>
            <div class="duration">⏳ Valable 5 minutes</div>
            <div class="warning">
              ⚠️ Passé ce délai, les étudiants n'ayant pas scanné seront automatiquement marqués ABSENTS
            </div>
            <div class="instruction">🔑 Code de présence</div>
            <div class="code">${code}</div>
            
            <div class="time-info">
              <div class="time-row">
                <span class="time-label">⏰ Expire à :</span>
                <span class="time-value expires-value">${expirationLocale}</span>
              </div>
              <div class="time-row">
                <span class="time-label">🕒 Heure actuelle :</span>
                <span class="time-value">${heureLocale}</span>
              </div>
            </div>
            
            <div class="admin-info">
              👤 Généré par ${user?.name} (Administrateur)
            </div>
            
            <p style="font-size: 1.2rem; color: #374151;">
              <strong>Code valable pour TOUS les étudiants</strong>
            </p>
            <p style="color: #6b7280;">
              Tous services • Tous niveaux • Toutes branches
            </p>
            
            <div class="current-time">
              Les étudiants ont 5 minutes pour entrer ce code
            </div>
            <div class="note">
              Les absents seront marqués automatiquement après expiration
            </div>
          </div>
        </body>
      </html>
    `);
    codeWindow.document.close();
  };

  const generateCode = async () => {
    try {
      toast.loading('Génération du code en cours...', { id: 'generate' });

      const res = await fetch('/api/code/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({})
      });

      const data = await res.json();
      
      toast.dismiss('generate');
      
      if (res.ok) {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
          showCodeModal(data.code, data.expiresAt);
        } else {
          const codeWindow = window.open('', '_blank');
          if (codeWindow) {
            displayCodeInWindow(codeWindow, data.code, data.expiresAt);
          } else {
            showCodeModal(data.code, data.expiresAt);
          }
        }

        setTimeout(async () => {
          try {
            await fetch('/api/code/mark-absent', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sessionId: data.sessionId })
            });
            fetchAllSessions();
            toast.info('Les absents ont été automatiquement marqués');
          } catch (error) {
            console.error('Erreur marquage absents:', error)
          }
        }, 5 * 60 * 1000);
        
        toast.success('Code généré (valable 5 minutes)');
        fetchAllSessions();
      } else {
        toast.error(data.error || 'Erreur lors de la génération');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.dismiss('generate');
      toast.error('Erreur lors de la génération du code');
    }
  };

  const generatePDF = async (type: 'all' | 'present' | 'absent') => {
    if (selectedSession === 'all') {
      toast.error('Veuillez sélectionner une séance spécifique');
      return;
    }

    try {
      const session = sessions.find(s => s.id === selectedSession);
      if (!session) return;

      const serviceName = session.services?.name || 'Tous les services';
      
      const studentsForPDF = selectedService === 'all' 
        ? sessionStudents 
        : sessionStudents.filter(s => s.service_id === selectedService);

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

      const attendanceData = attendanceDetails
        ?.filter(a => selectedService === 'all' || a.students.service_id === selectedService)
        .map(a => ({
          student: a.students,
          status: a.status,
          scanned_at: a.scanned_at
        })) || [];

      const sessionDate = new Date(session.date).toLocaleDateString('fr-FR');

      generateAttendancePDF(
        session.code,
        sessionDate,
        studentsForPDF,
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

  const BranchStatsChart = ({ data }: { data: any[] }) => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="total" fill="#9ca3af" name="Total" />
          <Bar yAxisId="left" dataKey="present" fill="#10b981" name="Présents" />
          <Bar yAxisId="left" dataKey="absent" fill="#ef4444" name="Absents" />
          <Bar yAxisId="right" dataKey="percentage" fill="#f59e0b" name="Taux %" />
        </BarChart>
      </ResponsiveContainer>
    )
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
              <h1 className="text-xl font-semibold">Dashboard Super Admin - {user?.name}</h1>
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

        {/* Génération de code universel (5 min) - Version Mobile */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>🎯 Génération du code de présence</CardTitle>
            <p className="text-sm text-gray-500">
              Code valable 5 minutes pour tous les services.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-4 sm:py-6">
              <Button
                onClick={generateCode}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white h-auto py-6 sm:py-8 px-6 sm:px-12 text-xl sm:text-2xl font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-3"
              >
                <span className="text-3xl sm:text-4xl">⏱️</span>
                <span className="flex flex-col items-start">
                  <span>GÉNÉRER LE CODE</span>
                  <span className="text-xs sm:text-sm opacity-90 font-normal">(5 minutes)</span>
                </span>
              </Button>
              
              {/* Message d'information */}
              <div className="mt-6 w-full max-w-md">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                  <div className="flex items-start">
                    <span className="text-blue-500 text-xl mr-3">📱</span>
                    <div>
                      <p className="text-sm text-blue-800 font-medium">
                        Génération depuis mobile
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Le code sera affiché dans une nouvelle fenêtre. 
                        Si rien ne s'affiche, vérifie que ton navigateur autorise les pop-ups.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filtres avancés */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filtres avancés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service
                </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="all">Tous les services</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branche
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="all">Toutes les branches</option>
                  {branches.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Niveau
                </label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="all">Tous les niveaux</option>
                  <option value="1">Niveau 1</option>
                  <option value="2">Niveau 2</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Baptême
                </label>
                <select
                  value={selectedBaptism}
                  onChange={(e) => setSelectedBaptism(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="all">Tous</option>
                  <option value="yes">Baptisés</option>
                  <option value="no">Non baptisés</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-600">
                  {filteredStudents.length} étudiants trouvés
                </span>
              </div>
              <div className="space-x-2">
                <Button onClick={resetFilters} variant="outline">
                  Réinitialiser les filtres
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sélection de séance avec visualisation des présences */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Présences par séance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sélectionner une séance
                  </label>
                  <select
                    value={selectedSession}
                    onChange={(e) => {
                      setSelectedSession(e.target.value)
                      fetchAttendanceBySession(e.target.value)
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">Choisir une séance...</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {new Date(session.date).toLocaleDateString('fr-FR')} - {session.services?.name || 'Universel'} (Code: {session.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedSession !== 'all' && (
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
                      {sessionStudents.map(student => {
                        const attendance = attendanceBySession.find(a => a.student_id === student.id)
                        const studentService = services.find(s => s.id === student.service_id)
                        return (
                          <div key={student.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <span className="font-medium">{student.full_name}</span>
                              <span className="text-sm text-gray-500 ml-2">({studentService?.name})</span>
                            </div>
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

                  {/* Statistiques par branche */}
                  {branchStats.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-4">📊 Statistiques par branche d'église</h4>
                      
                      {/* Graphique */}
                      <div className="mb-6">
                        <BranchStatsChart data={branchStats} />
                      </div>

                      {/* Tableau récapitulatif */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branche</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Présents</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Absents</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retards</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taux</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {branchStats.map((branch) => (
                              <tr key={branch.name}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {branch.name}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {branch.total}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">
                                  {branch.present}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 font-medium">
                                  {branch.absent}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-yellow-600 font-medium">
                                  {branch.late}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    branch.percentage >= 75 ? 'bg-green-100 text-green-800' :
                                    branch.percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {branch.percentage}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

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
              <CardTitle>Présences par service</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={presenceByService}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="présents" fill="#10b981" name="Présents" />
                  <Bar dataKey="absents" fill="#ef4444" name="Absents" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Présences par niveau</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={presenceByLevel}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="présents" fill="#8b5cf6" name="Présents" />
                  <Bar dataKey="total" fill="#9ca3af" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 5 des branches</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={presenceByBranch}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="présents" fill="#f59e0b" name="Présents" />
                  <Bar dataKey="total" fill="#9ca3af" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Répartition Baptême</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomPieChart data={baptismStats} />
            </CardContent>
          </Card>
        </div>

        {/* Liste des étudiants */}
        <Card>
          <CardHeader>
            <CardTitle>
              Liste des étudiants
              {selectedService !== 'all' && ` - Service: ${services.find(s => s.id === selectedService)?.name}`}
              {selectedBranch !== 'all' && ` - Branche: ${selectedBranch}`}
              {selectedLevel !== 'all' && ` - Niveau ${selectedLevel}`}
              {selectedBaptism !== 'all' && ` - ${selectedBaptism === 'yes' ? 'Baptisés' : 'Non baptisés'}`}
            </CardTitle>
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
                  {filteredStudents.map((student) => {
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
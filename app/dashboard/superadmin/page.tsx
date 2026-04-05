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
import { 
  UserCircleIcon, 
  Bars3Icon, 
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  UserGroupIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { ProfileSection } from '@/components/ProfileSection'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function SuperAdminDashboard() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [showProfile, setShowProfile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
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

  // États pour la présence service
  const [serviceAttendances, setServiceAttendances] = useState<any[]>([])
  const [selectedServiceForAttendance, setSelectedServiceForAttendance] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedCultType, setSelectedCultType] = useState<string>('all')
  const [cultTypes, setCultTypes] = useState<any[]>([])

  // Données pour les graphiques
  const [presenceByService, setPresenceByService] = useState<any[]>([])
  const [presenceByLevel, setPresenceByLevel] = useState<any[]>([])
  const [presenceByBranch, setPresenceByBranch] = useState<any[]>([])
  const [baptismStats, setBaptismStats] = useState<any[]>([])

  const toggleProfile = () => {
    setShowProfile(!showProfile)
    setMobileMenuOpen(false)
  }

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
      fetchServiceAttendances()
      fetchCultTypes()
    }
  }, [user, loading])

  useEffect(() => {
    applyFilters()
  }, [students, selectedService, selectedBranch, selectedLevel, selectedBaptism])

  useEffect(() => {
    fetchServiceAttendances()
  }, [selectedDate, selectedServiceForAttendance, selectedCultType])

  const fetchData = async () => {
    setLoadingData(true)
    try {
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .order('name')

      if (servicesData) {
        setServices(servicesData)
      }

      const { data: studentsData } = await supabase
        .from('students')
        .select('*')
        .order('full_name')

      if (studentsData) {
        setStudents(studentsData)
        setFilteredStudents(studentsData)
        
        const uniqueBranches = [...new Set(studentsData.map(s => s.branch))].sort()
        setBranches(uniqueBranches)
      }

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

      generateChartData(studentsData || [], servicesData || [])
      
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoadingData(false)
    }
  }

  const fetchCultTypes = async () => {
    try {
      const res = await fetch('/api/session-types', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (res.ok) setCultTypes(data)
    } catch (error) {
      console.error('Erreur chargement types:', error)
    }
  }

  const fetchServiceAttendances = async () => {
    try {
      let url = `/api/service/attendance/all?date=${selectedDate}`
      if (selectedServiceForAttendance !== 'all') {
        url += `&serviceId=${selectedServiceForAttendance}`
      }
      if (selectedCultType !== 'all') {
        url += `&type=${selectedCultType}`
      }
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (res.ok) {
        setServiceAttendances(data)
      } else {
        console.error('Erreur:', data.error)
      }
    } catch (error) {
      console.error('Erreur récupération présences service:', error)
    }
  }

  const generateServiceAttendancePDF = async () => {
    if (serviceAttendances.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();

      // Titre
      doc.setFontSize(20);
      doc.text('Académie de la Grâce', 105, 15, { align: 'center' });
      
      // Sous-titre
      doc.setFontSize(16);
      doc.text('Rapport des présences service', 105, 25, { align: 'center' });
      
      // Filtres appliqués
      const dateFormatted = new Date(selectedDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.setFontSize(12);
      doc.text(`Date: ${dateFormatted}`, 105, 35, { align: 'center' });
      
      if (selectedServiceForAttendance !== 'all') {
        const serviceName = services.find(s => s.id === selectedServiceForAttendance)?.name || '';
        doc.text(`Service: ${serviceName}`, 105, 42, { align: 'center' });
      }
      if (selectedCultType !== 'all') {
        const typeLabel = cultTypes.find(t => t.code === selectedCultType)?.label || selectedCultType;
        doc.text(`Type de culte: ${typeLabel}`, 105, 49, { align: 'center' });
      }
      
      // Date de génération
      const now = new Date();
      doc.setFontSize(8);
      doc.text(`Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`, 105, 280, { align: 'center' });
      
      let startY = 60;
      
      // Pour chaque session
      for (const session of serviceAttendances) {
        const serviceName = services.find(s => s.id === session.service_id)?.name || 'Service';
        const sessionDate = new Date(session.date).toLocaleDateString('fr-FR');
        const cultLabel = session.session_types?.label || session.type || 'Non défini';
        
        // Titre de la session
        doc.setFontSize(14);
        doc.text(`${serviceName} - ${sessionDate} (${cultLabel})`, 14, startY);
        startY += 8;
        
        // Statistiques
        const presents = session.service_attendance?.filter((a: any) => a.status === 'present').length || 0;
        const absents = session.service_attendance?.filter((a: any) => a.status === 'absent').length || 0;
        const total = session.service_attendance?.length || 0;
        
        doc.setFontSize(10);
        doc.text(`Total: ${total} | Présents: ${presents} | Absents: ${absents}`, 14, startY);
        startY += 8;
        
        // Tableau des présences
        const tableData = session.service_attendance?.map((att: any) => [
          att.students?.full_name || 'N/A',
          att.students?.branch || 'N/A',
          `Niveau ${att.students?.level || 1}`,
          att.students?.baptized ? 'Oui' : 'Non',
          att.students?.phone || '-',
          att.status === 'present' ? '✓ Présent' : '✗ Absent'
        ]) || [];
        
        if (tableData.length > 0) {
          autoTable(doc, {
            head: [['Nom', 'Branche', 'Niveau', 'Baptême', 'Téléphone', 'Statut']],
            body: tableData,
            startY: startY,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [79, 70, 229] },
            alternateRowStyles: { fillColor: [240, 240, 240] },
            margin: { left: 14, right: 14 },
          });
          
          startY = (doc as any).lastAutoTable.finalY + 15;
        } else {
          startY += 10;
        }
        
        // Nouvelle page si nécessaire
        if (startY > 250) {
          doc.addPage();
          startY = 20;
        }
      }
      
      const fileName = `presences_service_${selectedDate}_${selectedCultType !== 'all' ? selectedCultType : 'tous'}.pdf`;
      doc.save(fileName);
      
      toast.success('PDF généré avec succès');
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const generateChartData = (studentsData: Student[], servicesData: Service[]) => {
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

    const niveau1 = studentsData.filter(s => s.level === 1)
    const niveau2 = studentsData.filter(s => s.level === 2)
    const niveau3 = studentsData.filter(s => s.level === 3)
    setPresenceByLevel([
      { name: 'Niveau 1', présents: Math.floor(Math.random() * niveau1.length), total: niveau1.length },
      { name: 'Niveau 2', présents: Math.floor(Math.random() * niveau2.length), total: niveau2.length },
      { name: 'Niveau 3', présents: Math.floor(Math.random() * niveau3.length), total: niveau3.length }
    ])

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
            toast.info('Les absents ont été marqués automatiquement');
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
              📱 Montrez ce code aux étudiants. Ils ont 5 minutes pour l'entrer.
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
              ⚠️ Passé ce délai, les absents seront marqués automatiquement
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
            
            <div class="current-time">
              Les étudiants ont 5 minutes pour entrer ce code
            </div>
          </div>
        </body>
      </html>
    `);
    codeWindow.document.close();
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
      {/* Navigation */}
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
                {showProfile ? 'Mon profil' : 'Super Admin'}
              </h1>
            </div>

            {/* Boutons desktop */}
            <div className="hidden lg:flex items-center space-x-4">
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

            {/* Bouton déconnexion mobile */}
            <div className="flex items-center lg:hidden">
              <button
                onClick={logout}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                title="Déconnexion"
              >
                <ArrowLeftOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Menu mobile */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-2">
              <p className="text-sm text-gray-600 pb-2 border-b">Connecté en tant que ${user?.name}</p>
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

      {/* Contenu principal */}
      {showProfile ? (
        <ProfileSection user={user} onClose={() => setShowProfile(false)} />
      ) : (
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          {/* Statistiques globales */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-5 mb-4 sm:mb-8">
            <Card className="card-hover">
              <CardContent className="p-4 sm:pt-6">
                <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Étudiants</div>
                <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-gray-900">{stats.totalStudents}</div>
              </CardContent>
            </Card>
            
            <Card className="card-hover">
              <CardContent className="p-4 sm:pt-6">
                <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Services</div>
                <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-gray-900">{stats.totalServices}</div>
              </CardContent>
            </Card>
            
            <Card className="card-hover">
              <CardContent className="p-4 sm:pt-6">
                <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Présents</div>
                <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-green-600">{stats.presentToday}</div>
              </CardContent>
            </Card>
            
            <Card className="card-hover">
              <CardContent className="p-4 sm:pt-6">
                <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Baptisés</div>
                <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-blue-600">{stats.baptized}</div>
              </CardContent>
            </Card>

            <Card className="card-hover col-span-2 sm:col-span-2 lg:col-span-1">
              <CardContent className="p-4 sm:pt-6">
                <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Progression</div>
                <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-purple-600">{stats.averageProgress}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Section Présence Service - Vue générale avec filtres et export PDF */}
          <Card className="mb-8">
            <CardHeader className="px-4 sm:px-6 py-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5 text-indigo-600" />
                  📋 Présence Service - Vue générale
                </CardTitle>
                {serviceAttendances.length > 0 && (
                  <Button
                    onClick={generateServiceAttendancePDF}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                    Exporter PDF
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service
                  </label>
                  <select
                    value={selectedServiceForAttendance}
                    onChange={(e) => setSelectedServiceForAttendance(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Tous les services</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de culte
                  </label>
                  <select
                    value={selectedCultType}
                    onChange={(e) => setSelectedCultType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Tous les types</option>
                    {cultTypes.map(type => (
                      <option key={type.code} value={type.code}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {serviceAttendances.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Aucune session de présence service pour ces critères</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {serviceAttendances.map((session) => (
                    <div key={session.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {services.find(s => s.id === session.service_id)?.name || 'Service'}
                            </h3>
                            <p className="text-xs text-gray-500">
                              Session du {new Date(session.date).toLocaleDateString('fr-FR')}
                              {session.session_types && (
                                <span className="ml-2 inline-block px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                                  {session.session_types.label}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-sm">
                            <span className="text-green-600 font-medium">
                              {session.service_attendance?.filter((a: any) => a.status === 'present').length || 0}
                            </span>
                            <span className="text-gray-400 mx-1">/</span>
                            <span>{session.service_attendance?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {session.service_attendance?.map((att: any) => (
                            <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                              <span className="text-sm font-medium truncate">{att.students?.full_name}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                att.status === 'present' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {att.status === 'present' ? '✓ Présent' : '✗ Absent'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Génération de code académique */}
          <Card className="mb-8">
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-base sm:text-lg">🎯 Génération du code de présence académique</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-6">
              <div className="flex flex-col items-center justify-center py-4">
                <Button
                  onClick={generateCode}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white h-auto py-4 sm:py-6 px-4 sm:px-8 text-base sm:text-lg font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 sm:gap-3"
                >
                  <span className="text-xl sm:text-2xl">⏱️</span>
                  <span>GÉNÉRER LE CODE (5 MIN)</span>
                </Button>
                <p className="text-xs sm:text-sm text-gray-500 mt-3 text-center">
                  Les étudiants ont 5 minutes pour entrer ce code
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Filtres avancés */}
          <div className="lg:hidden mb-4">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <FunnelIcon className="w-4 h-4" />
              {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
            </Button>
          </div>

          <Card className={`mb-8 ${!showFilters && 'hidden lg:block'}`}>
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-base sm:text-lg">Filtres avancés</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Service
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Tous</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Branche
                  </label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Toutes</option>
                    {branches.map(branch => (
                      <option key={branch} value={branch}>{branch}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Niveau
                  </label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Tous</option>
                    <option value="1">Niveau 1</option>
                    <option value="2">Niveau 2</option>
                    <option value="3">Niveau 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Baptême
                  </label>
                  <select
                    value={selectedBaptism}
                    onChange={(e) => setSelectedBaptism(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Tous</option>
                    <option value="yes">Baptisés</option>
                    <option value="no">Non baptisés</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600">
                  {filteredStudents.length} étudiants
                </span>
                <Button onClick={resetFilters} variant="outline" size="sm">
                  Réinitialiser
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sélection de séance académique */}
          <Card className="mb-8">
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-base sm:text-lg">Présences académiques par séance</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-4">
                <select
                  value={selectedSession}
                  onChange={(e) => {
                    setSelectedSession(e.target.value)
                    fetchAttendanceBySession(e.target.value)
                  }}
                  className="w-full p-2 sm:p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Choisir une séance...</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {new Date(session.date).toLocaleDateString('fr-FR')} - {session.services?.name || 'Universel'}
                    </option>
                  ))}
                </select>

                {selectedSession !== 'all' && (
                  <>
                    <div className="flex justify-end gap-2 mb-4">
                      <Button
                        onClick={() => generatePDF('all')}
                        size="sm"
                        variant="outline"
                        className="text-indigo-600 border-indigo-600"
                      >
                        📄 PDF complet
                      </Button>
                      <Button
                        onClick={() => generatePDF('present')}
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600"
                      >
                        ✅ PDF présents
                      </Button>
                      <Button
                        onClick={() => generatePDF('absent')}
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600"
                      >
                        ❌ PDF absents
                      </Button>
                    </div>

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
                        {sessionStudents.map(student => {
                          const attendance = attendanceBySession.find(a => a.student_id === student.id)
                          const studentService = services.find(s => s.id === student.service_id)
                          return (
                            <div key={student.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 bg-gray-50 rounded gap-1 sm:gap-0">
                              <div>
                                <span className="text-sm font-medium">{student.full_name}</span>
                                <span className="text-xs text-gray-500 ml-2">({studentService?.name})</span>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-semibold self-start sm:self-auto ${
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
                <CardTitle className="text-base sm:text-lg">Présences par service</CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={presenceByService}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} interval={0} />
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
              <CardHeader className="px-4 sm:px-6 py-4">
                <CardTitle className="text-base sm:text-lg">Présences par niveau</CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <ResponsiveContainer width="100%" height={250}>
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
          </div>

          {/* Liste des étudiants */}
          <Card>
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-base sm:text-lg">
                Étudiants
                {selectedService !== 'all' && ` - ${services.find(s => s.id === selectedService)?.name}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {/* Version mobile : cartes */}
              <div className="block lg:hidden space-y-3">
                {filteredStudents.map((student) => {
                  const studentService = services.find(s => s.id === student.service_id)
                  return (
                    <div key={student.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <h3 className="font-medium text-gray-900 mb-2">{student.full_name}</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                        <div>Service: {studentService?.name || '-'}</div>
                        <div>Niveau {student.level}</div>
                        <div>Branche: {student.branch}</div>
                        <div>Baptême: {student.baptized ? 'Oui' : 'Non'}</div>
                        <div className="col-span-2">Tél: {student.phone || '-'}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Version desktop : tableau */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Niveau</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branche</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Baptême</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student) => {
                      const studentService = services.find(s => s.id === student.service_id)
                      return (
                        <tr key={student.id}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.full_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{studentService?.name || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">Niveau {student.level}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{student.branch}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              student.baptized ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {student.baptized ? 'Oui' : 'Non'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{student.phone || '-'}</td>
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
    </div>
  )
}
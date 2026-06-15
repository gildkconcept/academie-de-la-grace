'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ProfileSection } from '@/components/ProfileSection'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { LiveStatus } from '@/components/LiveStatus'
import { NotificationBell } from '@/components/NotificationBell'
import { studentService } from '@/services/studentService'
import { serviceService } from '@/services/serviceService'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Importer tes composants conservés
import { GlobalStatsSection } from './GlobalStatsSection'
import { SessionsHistorySection } from './SessionsHistorySection'
import { CodeGenerationSection } from './CodeGenerationSection'
import { StudentsListSection } from './StudentsListSection'
import { QuizSection } from './QuizSection'
import { AnnouncementSection } from './AnnouncementSection'

// Importer le composant Sidebar
import { Sidebar } from '@/components/layout/Sidebar'

// Icônes (garder uniquement celles utilisées)
import { 
  HomeIcon, 
  ChartBarIcon, 
  QrCodeIcon,
  UsersIcon,
  BookOpenIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline'

// Types
interface Student {
  id: string
  full_name: string
  username: string
  email: string
  phone: string
  branch: string
  level: number
  baptized: boolean
  service_id: string
  service_name?: string
  profile_image_url?: string
  maison_grace?: string
  created_at: string
}

// Configuration des sections (uniquement celles conservées)
const sections = [
  { id: 'overview', label: "Vue d'ensemble", icon: HomeIcon, component: GlobalStatsSection },
  { id: 'history', label: 'Historique', icon: ChartBarIcon, component: SessionsHistorySection },
  { id: 'codegen', label: 'Générer code', icon: QrCodeIcon, component: CodeGenerationSection },
  { id: 'students', label: 'Étudiants', icon: UsersIcon, component: StudentsListSection },
  { id: 'quiz', label: 'Quiz bibliques', icon: BookOpenIcon, component: QuizSection },
  { id: 'announcements', label: 'Annonces', icon: MegaphoneIcon, component: AnnouncementSection },
]

export default function SuperAdminDashboard() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [activeSectionId, setActiveSectionId] = useState('overview')
  const [showProfile, setShowProfile] = useState(false)
  
  // États pour la génération de code
  const [selectedGenerationLevel, setSelectedGenerationLevel] = useState('all')
  const [generatingCode, setGeneratingCode] = useState(false)

  // États pour les quiz
  const [showQuizSection, setShowQuizSection] = useState<string | false>(false)

  // États pour les étudiants
  const [students, setStudents] = useState<Student[]>([])
  const [services, setServices] = useState<any[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [selectedService, setSelectedService] = useState('all')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedBaptism, setSelectedBaptism] = useState('all')
  const [studentSearchTerm, setStudentSearchTerm] = useState('')
  const [studentServiceFilter, setStudentServiceFilter] = useState('all')
  const [studentLevelFilter, setStudentLevelFilter] = useState('all')
  const [studentBranchFilter, setStudentBranchFilter] = useState('all')
  const [studentBaptismFilter, setStudentBaptismFilter] = useState('all')
  const [studentMaisonGraceFilter, setStudentMaisonGraceFilter] = useState('all')
  const [studentMaisonGraceSearch, setStudentMaisonGraceSearch] = useState('')
  const [studentMaisonGraceList, setStudentMaisonGraceList] = useState<string[]>([])
  const [showStudentFilters, setShowStudentFilters] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showBadgeModal, setShowBadgeModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    if (user && user.role !== 'superadmin') {
      router.push('/dashboard/student')
    }
    if (user?.role === 'superadmin') {
      fetchServices()
      fetchStudents()
    }
  }, [user, loading, router])

  useEffect(() => {
    applyFilters()
  }, [selectedService, selectedBranch, selectedLevel, selectedBaptism, studentSearchTerm, students])

  const handleNavigate = (sectionId: string) => {
    setActiveSectionId(sectionId)
    setShowProfile(false)
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const fetchStudents = async () => {
    try {
      const studentsData = await studentService.getAll()
      setStudents(studentsData || [])
      setFilteredStudents(studentsData || [])
      
      const maisons = new Set<string>()
      studentsData?.forEach((s: any) => {
        if (s.maison_grace && s.maison_grace.trim() !== '') {
          maisons.add(s.maison_grace.trim())
        }
      })
      setStudentMaisonGraceList(Array.from(maisons).sort())
    } catch (error) {
      console.error('Erreur chargement étudiants:', error)
      toast.error('Erreur lors du chargement des étudiants')
    }
  }

  const fetchServices = async () => {
    try {
      const data = await serviceService.getAll()
      setServices(data || [])
    } catch (error) {
      console.error('Erreur chargement services:', error)
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
    if (studentSearchTerm) {
      filtered = filtered.filter(s => 
        s.full_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        s.username.toLowerCase().includes(studentSearchTerm.toLowerCase())
      )
    }
    
    setFilteredStudents(filtered)
  }

  const resetFilters = () => {
    setSelectedService('all')
    setSelectedBranch('all')
    setSelectedLevel('all')
    setSelectedBaptism('all')
    setStudentSearchTerm('')
    setStudentServiceFilter('all')
    setStudentLevelFilter('all')
    setStudentBranchFilter('all')
    setStudentBaptismFilter('all')
    setStudentMaisonGraceFilter('all')
    setStudentMaisonGraceSearch('')
    applyFilters()
  }

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('⚠️ Voulez-vous vraiment supprimer cet étudiant ? Cette action est irréversible.')) return
    try {
      await studentService.delete(studentId)
      toast.success('Étudiant supprimé')
      fetchStudents()
    } catch (error: any) {
      console.error(error)
      toast.error(error.response?.data?.error || 'Erreur serveur')
    }
  }

  const generateStudentsPDF = async () => {
    if (filteredStudents.length === 0) {
      toast.error('Aucun étudiant à exporter')
      return
    }

    const doc = new jsPDF({ orientation: 'landscape' })
    
    doc.setFontSize(20)
    doc.text('Académie de la Grâce', 148, 15, { align: 'center' })
    doc.setFontSize(16)
    doc.text('Liste des étudiants', 148, 25, { align: 'center' })
    
    const now = new Date()
    doc.setFontSize(10)
    doc.text(`Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`, 148, 33, { align: 'center' })
    
    doc.setFontSize(12)
    doc.text(`Total: ${filteredStudents.length} étudiants`, 20, 45)

    const tableData = filteredStudents.map(student => {
      const studentService = services.find(s => s.id === student.service_id)
      return [
        student.full_name || 'N/A',
        student.username || '-',
        studentService?.name || '-',
        `Niv. ${student.level || 1}`,
        student.branch || '-',
        student.baptized ? 'Oui' : 'Non',
        (student as any).maison_grace || '-',
        student.phone || '-'
      ]
    })

    autoTable(doc, {
      head: [['Nom', 'Username', 'Service', 'Niveau', 'Branche', 'Baptême', 'Maison grâce', 'Téléphone']],
      body: tableData,
      startY: 52,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [240, 240, 240] }
    })

    doc.save(`etudiants_${now.toISOString().split('T')[0]}.pdf`)
    toast.success('PDF généré avec succès')
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) return null

  if (showProfile) {
    return <ProfileSection user={user} onClose={() => setShowProfile(false)} />
  }

  const activeSection = sections.find(s => s.id === activeSectionId)
  const ActiveComponent = activeSection?.component
  const SectionIcon = activeSection?.icon || HomeIcon
  const sectionTitle = activeSection?.label || "Vue d'ensemble"

  const renderSectionContent = () => {
    if (activeSectionId === 'codegen') {
      return (
        <CodeGenerationSection
          selectedGenerationLevel={selectedGenerationLevel}
          setSelectedGenerationLevel={setSelectedGenerationLevel}
          generatingCode={generatingCode}
          setGeneratingCode={setGeneratingCode}
          user={user}
        />
      )
    }
    
    if (activeSectionId === 'students') {
      return (
        <StudentsListSection
          displayedStudents={filteredStudents}
          services={services}
          selectedService={selectedService}
          setSelectedService={setSelectedService}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
          selectedLevel={selectedLevel}
          setSelectedLevel={setSelectedLevel}
          selectedBaptism={selectedBaptism}
          setSelectedBaptism={setSelectedBaptism}
          studentSearchTerm={studentSearchTerm}
          setStudentSearchTerm={setStudentSearchTerm}
          studentServiceFilter={studentServiceFilter}
          setStudentServiceFilter={setStudentServiceFilter}
          studentLevelFilter={studentLevelFilter}
          setStudentLevelFilter={setStudentLevelFilter}
          studentBranchFilter={studentBranchFilter}
          setStudentBranchFilter={setStudentBranchFilter}
          studentBaptismFilter={studentBaptismFilter}
          setStudentBaptismFilter={setStudentBaptismFilter}
          studentMaisonGraceFilter={studentMaisonGraceFilter}
          setStudentMaisonGraceFilter={setStudentMaisonGraceFilter}
          studentMaisonGraceSearch={studentMaisonGraceSearch}
          setStudentMaisonGraceSearch={setStudentMaisonGraceSearch}
          studentMaisonGraceList={studentMaisonGraceList}
          showStudentFilters={showStudentFilters}
          setShowStudentFilters={setShowStudentFilters}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          resetFilters={resetFilters}
          handleDeleteStudent={handleDeleteStudent}
          setShowBadgeModal={setShowBadgeModal}
          generateStudentsPDF={generateStudentsPDF}
        />
      )
    }
    
    if (activeSectionId === 'quiz') {
      return (
        <QuizSection
          showQuizSection={showQuizSection}
          setShowQuizSection={setShowQuizSection}
        />
      )
    }
    
    if (ActiveComponent) {
      return <ActiveComponent />
    }
    
    return (
      <div className="bg-white/[0.06] border border-white/[0.08] rounded-xl p-8 text-center">
        <p className="text-white/40 text-sm">Section en cours de développement</p>
      </div>
    )
  }

  return (
    <div className="shell">
      <Sidebar
        onNavigate={handleNavigate}
        activeSection={activeSectionId}
        onLogout={handleLogout}
        userName={user.name || user.username || 'Admin'}
        userRole={user.role}
      />

      <div className="main">
        <div className="topbar">
          <div className="topbar-title">
            <SectionIcon className="w-4 h-4 text-indigo-400" />
            <span>{sectionTitle}</span>
          </div>
          <div className="topbar-right">
            <LiveStatus />
            <NotificationBell />
            <button onClick={() => setShowProfile(true)} className="topbar-btn" aria-label="Profil">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="content">
          {renderSectionContent()}
        </div>
      </div>
    </div>
  )
}
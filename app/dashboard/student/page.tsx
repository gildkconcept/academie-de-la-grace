'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressChart } from '@/components/charts'
import { toast } from 'sonner'
import { Attendance, Progress, Badge } from '@/types'
import { 
  UserCircleIcon, 
  Bars3Icon, 
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
  QrCodeIcon,
  PencilSquareIcon,
  AcademicCapIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'

export default function StudentDashboard() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [userLevel, setUserLevel] = useState<number>(1) // État local pour le niveau
  
  // États pour le profil
  const [profileData, setProfileData] = useState({
    name: '',
    username: '',
    email: '',
    phone: ''
  })
  const [loadingUpdate, setLoadingUpdate] = useState(false)

  // === NOUVEAU : États pour les badges ===
  const [badges, setBadges] = useState<(Badge & { awarded_at?: string })[]>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    if (user?.role === 'service_manager') {
      router.push('/dashboard/manager')
    }
    if (user?.role === 'superadmin') {
      router.push('/dashboard/superadmin')
    }
    if (user?.id) {
      console.log('👤 Utilisateur connecté:', user)
      console.log('📊 Niveau depuis user:', user.level)
      
      // Récupérer le niveau depuis la base de données pour être sûr
      fetchUserLevel()
      fetchData()
      fetchBadges() // Charger les badges
      if (user) {
        setProfileData({
          name: user.name || '',
          username: user.username || '',
          email: user.email || '',
          phone: user.phone || ''
        })
      }
    }
  }, [user, loading])

  const fetchUserLevel = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('level')
        .eq('id', user?.id)
        .single()
      
      if (error) {
        console.error('Erreur récupération niveau:', error)
        return
      }
      
      console.log('📊 Niveau depuis base de données:', data?.level)
      setUserLevel(data?.level || 1)
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const fetchData = async () => {
    setLoadingData(true)
    try {
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*, sessions(*)')
        .eq('student_id', user?.id)
        .order('date', { ascending: false })
        .limit(10)

      if (attendanceData) {
        setAttendance(attendanceData)
      }

      const { data: progressData } = await supabase
        .from('progress')
        .select('*')
        .eq('student_id', user?.id)

      if (progressData) {
        setProgress(progressData)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoadingData(false)
    }
  }

  // === NOUVELLE FONCTION : Récupération des badges de l'étudiant ===
  const fetchBadges = async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('student_badges')
        .select(`
          awarded_at,
          badge:badges (*)
        `)
        .eq('student_id', user.id)
        .order('awarded_at', { ascending: false })

      if (error) throw error
      if (data) {
        const formatted = data.map((item: any) => ({
          ...item.badge,
          awarded_at: item.awarded_at
        }))
        setBadges(formatted)
      }
    } catch (error) {
      console.error('Erreur chargement badges:', error)
    }
  }

  const handleProfileUpdate = async () => {
    if (!profileData.name || !profileData.username) {
      toast.error('Le nom et le nom d\'utilisateur sont requis')
      return
    }

    setLoadingUpdate(true)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profileData)
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Profil mis à jour avec succès')
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        toast.error(data.error || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour du profil')
    } finally {
      setLoadingUpdate(false)
    }
  }

  // === FONCTION MODIFIÉE SANS GÉOLOCALISATION ===
  const verifyCode = async () => {
    if (code.length !== 6) {
      toast.error('Le code doit faire 6 chiffres')
      return
    }

    setVerifying(true)
    try {
      const res = await fetch('/api/code/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('✅ Présence enregistrée !')
        setShowCodeInput(false)
        setCode('')
        fetchData()
        fetchBadges() // Rafraîchir les badges après nouvelle présence
      } else {
        toast.error(data.error || 'Code invalide')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la vérification')
    } finally {
      setVerifying(false)
    }
  }

  const calculateProgress = () => {
    if (progress.length === 0) return 0
    const total = progress.reduce((acc, p) => acc + (p.score || 0), 0)
    return Math.round(total / progress.length)
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

  const currentLevel = userLevel || user.level || 1
  console.log('🎨 Affichage du niveau:', currentLevel)

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center flex-1">
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
                {showProfile ? 'Mon profil' : 'Mon Espace Étudiant'}
              </h1>
            </div>

            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                <AcademicCapIcon className="w-4 h-4" />
                Niveau {currentLevel}
              </div>
              <Button
                onClick={() => setShowProfile(!showProfile)}
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
              >
                <ArrowLeftOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-2">
              <p className="text-sm text-gray-600 pb-2 border-b">Connecté en tant que {user.name}</p>
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg">
                <AcademicCapIcon className="w-4 h-4 text-indigo-600" />
                <span className="text-sm text-indigo-600">Niveau {currentLevel}</span>
              </div>
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
            </div>
          </div>
        )}
      </nav>

      {showProfile ? (
        <div className="max-w-3xl mx-auto py-4 sm:py-6 px-4 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PencilSquareIcon className="w-5 h-5" />
                Modifier mon profil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-center sm:justify-start space-x-4">
                  <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-3xl font-bold text-indigo-600">
                      {profileData.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{profileData.name}</p>
                    <p className="text-sm text-gray-500">@{profileData.username}</p>
                    <p className="text-xs text-gray-400 mt-1">Niveau {currentLevel}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom d'utilisateur</label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleProfileUpdate}
                    disabled={loadingUpdate}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {loadingUpdate ? 'Mise à jour...' : 'Enregistrer'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* === NOUVEAU : SECTION BADGES === */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 text-yellow-500" />
                Mes distinctions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {badges.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucun badge obtenu pour le moment. Continuez à participer !</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {badges.map(badge => (
                    <div key={badge.id} className="border rounded-lg p-4 flex items-start gap-3 bg-gradient-to-r from-yellow-50 to-amber-50">
                      <div className="text-3xl">🏅</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{badge.name}</h3>
                        <p className="text-xs text-gray-600">{badge.description}</p>
                        <p className="text-xs text-gray-400 mt-1">Obtenu le {new Date(badge.awarded_at!).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          {/* Statistiques personnelles */}
          <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-4 sm:mb-8">
            <Card className="card-hover">
              <CardContent className="p-3 sm:pt-6">
                <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Présences</div>
                <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-green-600">
                  {attendance.filter(a => a.status === 'present').length}
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="p-3 sm:pt-6">
                <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Progression</div>
                <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-blue-600">
                  {calculateProgress()}%
                </div>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardContent className="p-3 sm:pt-6">
                <div className="text-xs sm:text-sm font-medium text-gray-500 truncate">Modules</div>
                <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-purple-600">
                  {progress.filter(p => p.completed).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graphique de progression */}
          <Card className="mb-4 sm:mb-8">
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-base sm:text-lg">Ma progression académique</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <ProgressChart data={progress.map(p => ({
                name: p.module,
                progress: p.score
              }))} />
            </CardContent>
          </Card>

          {/* Historique des présences */}
          <Card className="mb-4 sm:mb-8">
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="text-base sm:text-lg">Historique des présences</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="block lg:hidden space-y-2">
                {attendance.length === 0 ? (
                  <p className="text-gray-500 text-center py-4 text-sm">Aucune présence enregistrée</p>
                ) : (
                  attendance.map((a) => (
                    <div key={a.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">
                          {new Date(a.date).toLocaleDateString('fr-FR')}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          a.status === 'present' ? 'bg-green-100 text-green-800' :
                          a.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {a.status === 'present' ? 'Présent' : a.status === 'late' ? 'Retard' : 'Absent'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {a.scanned_at ? new Date(a.scanned_at).toLocaleTimeString('fr-FR') : '-'}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Heure</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendance.map((a) => (
                      <tr key={a.id}>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(a.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            a.status === 'present' ? 'bg-green-100 text-green-800' :
                            a.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {a.status === 'present' ? 'Présent' : a.status === 'late' ? 'Retard' : 'Absent'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {a.scanned_at ? new Date(a.scanned_at).toLocaleTimeString('fr-FR') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bouton flottant pour le code */}
      {!showProfile && !showCodeInput && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 w-[calc(100%-2rem)] sm:w-auto max-w-md px-4">
          <button
            onClick={() => setShowCodeInput(true)}
            className="w-full bg-indigo-600 text-white py-4 px-6 rounded-full shadow-lg hover:bg-indigo-700 active:bg-indigo-800 transition-all duration-200 text-base sm:text-lg font-semibold flex items-center justify-center gap-3"
          >
            <QrCodeIcon className="w-5 h-5" />
            <span>Entrer le code de présence</span>
          </button>
        </div>
      )}

      {/* Modal Code */}
      {showCodeInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg sm:text-xl font-bold mb-4">🔑 Code de présence</h3>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full text-center text-3xl sm:text-4xl font-bold p-3 sm:p-4 border-2 border-indigo-300 rounded-lg mb-4 tracking-widest"
              autoFocus
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={verifyCode}
                disabled={verifying || code.length !== 6}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium text-sm sm:text-base"
              >
                {verifying ? 'Vérification...' : 'Valider ma présence'}
              </button>
              <button
                onClick={() => {
                  setShowCodeInput(false)
                  setCode('')
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-medium text-sm sm:text-base"
              >
                Annuler
              </button>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 text-center mt-4">
              ⏰ Le code expire après 15 minutes.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
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
import { StudentQuiz } from '@/components/StudentQuiz'
import { ProfileSection } from '@/components/ProfileSection'
import { NotificationBell } from '@/components/NotificationBell'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { ChatGroups } from '@/components/ChatGroups'
import { ChatMessages } from '@/components/ChatMessages'
import { DailyVerseCard } from '@/components/DailyVerseCard'
import { LiveStatus } from '@/components/LiveStatus'
import { 
  UserCircleIcon, 
  Bars3Icon, 
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
  QrCodeIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'

export default function StudentDashboard() {
  const { user, loading, logout } = useAuth()
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false) 
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [userLevel, setUserLevel] = useState<number>(1)
  const [badges, setBadges] = useState<(Badge & { awarded_at?: string })[]>([])
  const [showChat, setShowChat] = useState(false)
  const [selectedChatGroup, setSelectedChatGroup] = useState<{ id: string; name: string } | null>(null)

 useEffect(() => {
  if (!loading && !user) router.push('/login')
  if (user?.role === 'service_manager') router.push('/dashboard/manager')
  if (user?.role === 'superadmin') router.push('/dashboard/superadmin')
  if (user?.id) { 
    fetchUserLevel(); 
    fetchData(); 
    fetchBadges();
    fetchActiveSessions();  
  }
}, [user, loading])

  const fetchUserLevel = async () => {
    const { data } = await supabase.from('students').select('level').eq('id', user?.id).single()
    if (data) setUserLevel(data.level || 1)
  }

  const fetchData = async () => {
    setLoadingData(true)
    try {
      const { data: attendanceData } = await supabase.from('attendance').select('*, sessions(*)').eq('student_id', user?.id).order('date', { ascending: false }).limit(10)
      if (attendanceData) setAttendance(attendanceData)
      const { data: progressData } = await supabase.from('progress').select('*').eq('student_id', user?.id)
      if (progressData) setProgress(progressData)
    } catch (error) { toast.error('Erreur lors du chargement des données') }
    finally { setLoadingData(false) }
  }

  const fetchBadges = async () => {
    if (!user?.id) return
    const { data } = await supabase.from('student_badges').select('awarded_at, badge:badges(*)').eq('student_id', user.id).order('awarded_at', { ascending: false })
    if (data) setBadges(data.map((item: any) => ({ ...item.badge, awarded_at: item.awarded_at })))
  }

  const fetchActiveSessions = async () => {
    setLoadingSessions(true)
    try {
      const res = await fetch('/api/sessions/active', {
        credentials: 'include'
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setActiveSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Erreur récupération sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const verifyCode = async () => {
    if (code.length !== 6) { toast.error('Le code doit faire 6 chiffres'); return }
    setVerifying(true)
    try {
      const res = await fetch('/api/code/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ code }) })
      const data = await res.json()
      if (res.ok) { toast.success('✅ Présence enregistrée !'); setShowCodeInput(false); setCode(''); fetchData(); fetchBadges() }
      else { toast.error(data.error || 'Code invalide') }
    } catch (error) { toast.error('Erreur lors de la vérification') }
    finally { setVerifying(false) }
  }

  const calculateProgress = () => {
    if (progress.length === 0) return 0
    return Math.round(progress.reduce((acc, p) => acc + (p.score || 0), 0) / progress.length)
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a1a5a 0%, #0f2d82 50%, #0a1e64 100%)' }}>
        <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const currentLevel = userLevel || user.level || 1

  return (
    <div className="min-h-screen relative" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
      {/* Fond */}
      <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
      <div className="fixed inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.94) 0%, rgba(15,45,130,0.9) 40%, rgba(10,30,100,0.92) 70%, rgba(4,12,65,0.96) 100%)' }} />
      <div className="fixed w-[300px] h-[300px] rounded-full bg-blue-400/10 blur-[100px] -top-[50px] -right-[50px] z-20 pointer-events-none" />
      <div className="fixed w-[250px] h-[250px] rounded-full bg-blue-600/8 blur-[100px] bottom-[10%] -left-[50px] z-20 pointer-events-none" />

      <div className="relative z-30 pb-20 sm:pb-24">
        {/* Navigation - Universelle */}
        <nav className="sticky top-0 z-40 bg-[rgba(5,15,70,0.6)] backdrop-blur-2xl border-b border-white/[0.08]">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex justify-between items-center h-12 sm:h-14 md:h-16">
              {/* Logo et titre */}
              <div className="flex items-center flex-1 min-w-0">
                <button 
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                  className="lg:hidden p-1.5 sm:p-2 text-white/70 hover:text-white rounded-lg transition-colors"
                  aria-label="Menu"
                >
                  {mobileMenuOpen ? <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Bars3Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
                <h1 className="text-xs sm:text-sm md:text-base lg:text-lg font-normal text-white ml-1 sm:ml-2 lg:ml-0 truncate" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {showProfile ? 'Mon profil' : 'Mon Espace'}
                </h1>
              </div>

              {/* Desktop - caché sur mobile/tablette */}
              <div className="hidden lg:flex items-center gap-2 xl:gap-3">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Photo" className="w-8 h-8 xl:w-10 xl:h-10 rounded-full object-cover border-2 border-white/20" />
                ) : (
                  <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20">
                    <span className="text-xs xl:text-sm font-bold text-white/60">{user?.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 xl:gap-1.5 px-2 xl:px-2.5 py-0.5 xl:py-1 bg-white/10 text-white/80 rounded-full text-[10px] xl:text-xs">
                  <AcademicCapIcon className="w-3 h-3 xl:w-3.5 xl:h-3.5" /> Niv.{currentLevel}
                </div>
                {user?.maisonGrace && (
                  <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-white/10 text-white/80 rounded-full text-xs">🏠 {user.maisonGrace}</div>
                )}
                <NotificationBell />
                <LiveStatus />
                <button onClick={() => setShowChat(true)} className="flex items-center gap-1 xl:gap-1.5 px-2 xl:px-3 py-1 xl:py-1.5 bg-white/10 text-white/80 rounded-lg text-[10px] xl:text-xs hover:bg-white/20 transition-colors">
                  <ChatBubbleLeftRightIcon className="w-3.5 h-3.5 xl:w-4 xl:h-4" /> Chat
                </button>
                <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-1 xl:gap-1.5 px-2 xl:px-3 py-1 xl:py-1.5 bg-white/10 text-white/80 rounded-lg text-[10px] xl:text-xs hover:bg-white/20 transition-colors">
                  <UserCircleIcon className="w-3.5 h-3.5 xl:w-4 xl:h-4" /> Profil
                </button>
                <button onClick={logout} className="px-2 xl:px-3 py-1 xl:py-1.5 bg-red-500/20 text-red-300 rounded-lg text-[10px] xl:text-xs hover:bg-red-500/30 transition-colors">
                  Déco
                </button>
              </div>

              {/* Mobile/Tablette */}
              <div className="flex items-center gap-1 sm:gap-2 lg:hidden">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Photo" className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-white/20" />
                ) : (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <span className="text-[10px] sm:text-xs font-bold text-white/60">{user?.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                )}
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/10 text-white/80 rounded-full text-[9px] sm:text-[10px]">
                  <AcademicCapIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {currentLevel}
                </div>
                <NotificationBell />
                <LiveStatus />
                <button onClick={logout} className="p-1 sm:p-1.5 text-red-400 hover:text-red-300" aria-label="Déconnexion">
                  <ArrowLeftOnRectangleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Menu mobile déroulant */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-white/[0.08] bg-[rgba(5,15,70,0.98)] backdrop-blur-2xl">
              <div className="px-3 py-2 space-y-1">
                <div className="flex items-center gap-2 pb-2 mb-1 border-b border-white/[0.08]">
                  {user?.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="Photo" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border border-white/20" />
                  ) : (
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-white/60">{user?.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm truncate">{user?.name}</p>
                    <p className="text-xs text-white/40">Niveau {currentLevel}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => { setShowChat(true); setMobileMenuOpen(false) }} 
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  <span>Chat</span>
                </button>
                
                <button 
                  onClick={() => { setShowProfile(true); setMobileMenuOpen(false) }} 
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <UserCircleIcon className="w-4 h-4" />
                  <span>Mon profil</span>
                </button>
                
                {user?.maisonGrace && (
                  <div className="flex items-center gap-3 px-3 py-2 text-white/50 text-xs">
                    <span>🏠</span>
                    <span className="truncate">{user.maisonGrace}</span>
                  </div>
                )}
                
                <button 
                  onClick={logout} 
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors mt-1 border-t border-white/[0.08] pt-2"
                >
                  <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                  <span>Déconnexion</span>
                </button>
              </div>
            </div>
          )}
        </nav>

        {showProfile ? (
          <ProfileSection user={user} onClose={() => setShowProfile(false)} />
        ) : (
          <div className="max-w-7xl mx-auto py-2 sm:py-4 md:py-6 px-2 sm:px-4 lg:px-8">
            {/* ✨ Verset du jour */}
            <DailyVerseCard />
            
            {/* Statistiques - 3 colonnes responsives */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
              {[
                { label: 'Présences', value: attendance.filter(a => a.status === 'present').length, color: 'text-green-300' },
                { label: 'Prog.', value: `${calculateProgress()}%`, color: 'text-blue-300' },
                { label: 'Modules', value: progress.filter(p => p.completed).length, color: 'text-purple-300' }
              ].map((stat, i) => (
                <div key={i} className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-lg sm:rounded-xl p-1.5 sm:p-3 md:p-5 text-center">
                  <div className={`text-sm sm:text-lg md:text-2xl font-bold ${stat.color}`} style={{ fontFamily: "'Playfair Display', serif" }}>{stat.value}</div>
                  <div className="text-white/50 text-[8px] sm:text-xs mt-0.5 sm:mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Progression */}
            <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-lg sm:rounded-xl p-2 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-6">
              <h3 className="text-sm sm:text-base md:text-lg font-normal text-white mb-2 sm:mb-3 md:mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Ma progression</h3>
              <ProgressChart data={progress.map(p => ({ name: p.module, progress: p.score }))} />
            </div>

            {/* Quiz */}
            <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-lg sm:rounded-xl p-2 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-6">
              <h3 className="text-sm sm:text-base md:text-lg font-normal text-white mb-2 sm:mb-3 md:mb-4 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                <span>📝</span> Quiz
              </h3>
              <StudentQuiz />
            </div>

            {/* Historique */}
            <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-lg sm:rounded-xl p-2 sm:p-4 md:p-6">
              <h3 className="text-sm sm:text-base md:text-lg font-normal text-white mb-2 sm:mb-3 md:mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Historique</h3>
              {attendance.length === 0 ? (
                <p className="text-white/40 text-center py-4 sm:py-6 md:py-8 text-xs sm:text-sm">Aucune présence enregistrée</p>
              ) : (
                <div className="space-y-1.5 sm:space-y-2">
                  {attendance.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex justify-between items-center p-1.5 sm:p-2 md:p-3 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                      <span className="text-white/80 text-[10px] sm:text-xs md:text-sm">{new Date(a.date).toLocaleDateString('fr-FR')}</span>
                      <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
                        <span className={`px-1 sm:px-1.5 md:px-2 py-0.5 rounded-full text-[8px] sm:text-[10px] md:text-xs font-semibold ${
                          a.status === 'present' ? 'bg-green-500/20 text-green-300' : a.status === 'late' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                          {a.status === 'present' ? 'Présent' : a.status === 'late' ? 'Retard' : 'Absent'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {attendance.length > 5 && (
                    <p className="text-center text-white/30 text-[10px] sm:text-xs pt-1">+{attendance.length - 5} autres</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bouton flottant code */}
        {!showProfile && !showCodeInput && (
          <div className="fixed bottom-3 sm:bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-md px-2 sm:px-3 z-40">
            <button 
              onClick={() => setShowCodeInput(true)}
              className="w-full bg-white text-[#1a3a8f] py-2 sm:py-3 md:py-4 px-3 sm:px-4 rounded-full shadow-lg hover:shadow-xl transition-all text-xs sm:text-sm md:text-base font-semibold flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 transition-transform"
            >
              <QrCodeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" /> Code de présence
            </button>
          </div>
        )}

        {/* Modal Code */}
        {showCodeInput && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-3 md:p-4">
            <div className="bg-white/[0.08] backdrop-blur-3xl border border-white/[0.15] rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 max-w-md w-full shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
              <h3 className="text-base sm:text-lg md:text-xl font-normal text-white mb-2 sm:mb-3 md:mb-4 text-center" style={{ fontFamily: "'Playfair Display', serif" }}>🔑 Code</h3>
              <input 
                type="text" 
                value={code} 
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                placeholder="123456"
                className="w-full text-center text-2xl sm:text-3xl md:text-4xl font-bold p-2 sm:p-3 md:p-4 bg-white/90 border-2 border-white/30 rounded-lg sm:rounded-xl mb-3 sm:mb-4 tracking-widest text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400" 
                autoFocus 
              />
              <div className="flex gap-2">
                <button 
                  onClick={verifyCode} 
                  disabled={verifying || code.length !== 6}
                  className="flex-1 bg-white text-[#1a3a8f] py-2 sm:py-2.5 md:py-3 rounded-lg font-bold text-xs sm:text-sm md:text-base hover:shadow-lg transition-all disabled:opacity-50 active:scale-95"
                >
                  {verifying ? 'Vérif...' : 'Valider'}
                </button>
                <button 
                  onClick={() => { setShowCodeInput(false); setCode(''); }}
                  className="flex-1 bg-white/10 text-white py-2 sm:py-2.5 md:py-3 rounded-lg text-xs sm:text-sm md:text-base hover:bg-white/20 transition-colors"
                >
                  Annuler
                </button>
              </div>
              <p className="text-white/40 text-[9px] sm:text-[10px] md:text-xs text-center mt-2 sm:mt-3 md:mt-4">⏰ Code expire après 15 min</p>
            </div>
          </div>
        )}

        {/* Modal Chat */}
        {showChat && !selectedChatGroup && (
          <ChatGroups onSelectGroup={(id, name) => setSelectedChatGroup({ id, name })} onClose={() => setShowChat(false)} />
        )}
        {showChat && selectedChatGroup && (
          <ChatMessages
            groupId={selectedChatGroup.id}
            groupName={selectedChatGroup.name}
            currentUserId={user?.id || ''}
            currentUserName={user?.name || ''}
            onBack={() => setSelectedChatGroup(null)}
          />
        )}
      </div>
    </div>
  )
}
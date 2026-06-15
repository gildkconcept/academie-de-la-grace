'use client'

import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/NotificationBell'
import { LiveStatus } from '@/components/LiveStatus'
import { ChatBubbleLeftRightIcon, UserCircleIcon, Bars3Icon, XMarkIcon, ArrowLeftOnRectangleIcon, PhoneXMarkIcon, DocumentChartBarIcon, TrophyIcon, UserGroupIcon } from '@heroicons/react/24/outline'

interface DashboardNavbarProps {
  user: any
  showProfile: boolean
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  setShowProfile: (show: boolean) => void
  setShowChat: (show: boolean) => void
  setShowCreateNoPhoneModal: (show: boolean) => void
  setShowAssistedAttendanceModal: (show: boolean) => void
  logout: () => void
  router: any
}

export const DashboardNavbar = ({
  user,
  showProfile,
  mobileMenuOpen,
  setMobileMenuOpen,
  setShowProfile,
  setShowChat,
  setShowCreateNoPhoneModal,
  setShowAssistedAttendanceModal,
  logout,
  router
}: DashboardNavbarProps) => {

  const toggleProfile = () => {
    setShowProfile(!showProfile)
    setMobileMenuOpen(false)
  }

  return (
    <nav className="bg-[rgba(5,15,70,0.6)] backdrop-blur-2xl border-b border-white/[0.08] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo et titre */}
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
          <div className="hidden lg:flex items-center space-x-2">
            <NotificationBell />
            
            <button 
              onClick={() => setShowChat(true)} 
              className="flex items-center gap-1 px-2 py-1.5 bg-white/10 text-white/80 rounded-lg text-xs hover:bg-white/20 transition-colors"
            >
              <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" /> Chat
            </button>
            
            <button
              onClick={() => setShowCreateNoPhoneModal(true)}
              className="flex items-center gap-1 px-2 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-xs hover:bg-purple-500/30 transition-colors"
            >
              <PhoneXMarkIcon className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Sans tel</span>
              <span className="inline xl:hidden">📵</span>
            </button>
            
            <button
              onClick={() => setShowAssistedAttendanceModal(true)}
              className="flex items-center gap-1 px-2 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs hover:bg-indigo-500/30 transition-colors"
            >
              <PhoneXMarkIcon className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Prés. assistée</span>
              <span className="inline xl:hidden">✏️</span>
            </button>
            
            <button
              onClick={() => router.push('/dashboard/superadmin/monthly-reports')}
              className="flex items-center gap-1 px-2 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-xs hover:bg-blue-500/30 transition-colors"
            >
              <DocumentChartBarIcon className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Rapports</span>
              <span className="inline xl:hidden">📊</span>
            </button>
            
            {/* BOUTON ACTIVITÉ LIVE */}
            <button
              onClick={() => router.push('/dashboard/superadmin/online-users')}
              className="flex items-center gap-1 px-2 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-xs hover:bg-green-500/30 transition-colors relative"
            >
              <div className="relative">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              </div>
              <span className="hidden xl:inline">LIVE</span>
              <span className="inline xl:hidden">🟢</span>
            </button>
            
            {/* BOUTON CLASSEMENT */}
            <button
              onClick={() => router.push('/dashboard/superadmin/rankings')}
              className="flex items-center gap-1 px-2 py-1.5 bg-yellow-500/20 text-yellow-300 rounded-lg text-xs hover:bg-yellow-500/30 transition-colors"
            >
              <TrophyIcon className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Classement</span>
              <span className="inline xl:hidden">🏆</span>
            </button>

            {/* BOUTON NOTES MANUELLES */}
            <button
              onClick={() => router.push('/dashboard/superadmin/manual-notes')}
              className="flex items-center gap-1 px-2 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-xs hover:bg-purple-500/30 transition-colors"
            >
              <PhoneXMarkIcon className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Notes</span>
              <span className="inline xl:hidden">📝</span>
            </button>

            {/* BOUTON PROMOTIONS */}
            <button
              onClick={() => router.push('/dashboard/superadmin/promotions')}
              className="flex items-center gap-1 px-2 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-xs hover:bg-green-500/30 transition-colors"
            >
              <UserGroupIcon className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Promotions</span>
              <span className="inline xl:hidden">🎓</span>
            </button>

            <Button onClick={toggleProfile} variant="outline" size="sm" className="flex items-center gap-1 h-8 px-2 text-xs">
              <UserCircleIcon className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{showProfile ? 'Dashboard' : 'Profil'}</span>
              <span className="inline xl:hidden">👤</span>
            </Button>
            
            <Button onClick={logout} variant="destructive" size="sm" className="h-8 px-2 text-xs">
              <ArrowLeftOnRectangleIcon className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Déco</span>
              <span className="inline xl:hidden">🚪</span>
            </Button>
          </div>
          
          {/* Boutons mobile */}
          <div className="flex items-center gap-2 lg:hidden">
            <NotificationBell />
            
            <button onClick={() => setShowChat(true)} className="p-2 text-white/60 hover:text-white">
              <ChatBubbleLeftRightIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white/60 hover:text-white"
            >
              {mobileMenuOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
            </button>
            
            <button
              onClick={logout}
              className="p-2 text-red-400 hover:text-red-300"
              title="Déconnexion"
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile déroulant */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/[0.08] bg-[rgba(5,15,70,0.95)] backdrop-blur-2xl">
          <div className="px-4 py-3 space-y-2">
            <div className="pb-2 mb-2 border-b border-white/[0.08]">
              <p className="text-xs text-white/50">Connecté en tant que</p>
              <p className="text-sm text-white font-medium">{user?.name}</p>
            </div>
            
            <button
              onClick={() => { setShowCreateNoPhoneModal(true); setMobileMenuOpen(false) }}
              className="w-full flex items-center px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <PhoneXMarkIcon className="w-5 h-5 mr-3 text-purple-300" />
              <span>Sans téléphone</span>
            </button>
            
            <button
              onClick={() => { setShowAssistedAttendanceModal(true); setMobileMenuOpen(false) }}
              className="w-full flex items-center px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <PhoneXMarkIcon className="w-5 h-5 mr-3 text-indigo-300" />
              <span>Présence assistée</span>
            </button>
            
            <button
              onClick={() => { router.push('/dashboard/superadmin/monthly-reports'); setMobileMenuOpen(false) }}
              className="w-full flex items-center px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <DocumentChartBarIcon className="w-5 h-5 mr-3 text-blue-300" />
              <span>Rapports mensuels</span>
            </button>
            
            {/* BOUTON ACTIVITÉ LIVE */}
            <button
              onClick={() => { router.push('/dashboard/superadmin/online-users'); setMobileMenuOpen(false) }}
              className="w-full flex items-center px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <div className="relative mr-3">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75" />
              </div>
              <span>Activité LIVE</span>
            </button>
            
            {/* BOUTON CLASSEMENT */}
            <button
              onClick={() => { router.push('/dashboard/superadmin/rankings'); setMobileMenuOpen(false) }}
              className="w-full flex items-center px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <TrophyIcon className="w-5 h-5 mr-3 text-yellow-300" />
              <span>Classement</span>
            </button>
            
            {/* BOUTON NOTES MANUELLES */}
            <button
              onClick={() => { router.push('/dashboard/superadmin/manual-notes'); setMobileMenuOpen(false) }}
              className="w-full flex items-center px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <PhoneXMarkIcon className="w-5 h-5 mr-3 text-purple-300" />
              <span>Notes manuelles</span>
            </button>

            {/* BOUTON PROMOTIONS */}
            <button
              onClick={() => { router.push('/dashboard/superadmin/promotions'); setMobileMenuOpen(false) }}
              className="w-full flex items-center px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <UserGroupIcon className="w-5 h-5 mr-3 text-green-300" />
              <span>Promotions</span>
            </button>
            
            <button
              onClick={() => { toggleProfile(); setMobileMenuOpen(false) }}
              className="w-full flex items-center px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <UserCircleIcon className="w-5 h-5 mr-3" />
              <span>{showProfile ? 'Tableau de bord' : 'Mon profil'}</span>
            </button>
            
            <button
              onClick={logout}
              className="w-full flex items-center px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors mt-2 border-t border-white/[0.08] pt-3"
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-3" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
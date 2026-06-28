'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  HomeIcon, 
  ChartBarIcon, 
  QrCodeIcon,
  UsersIcon,
  BookOpenIcon,
  MegaphoneIcon,
  DocumentChartBarIcon,
  TrophyIcon,
  PencilIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  UserPlusIcon,
  ArrowLeftOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Bars3Icon,
  PhoneIcon  // ✅ AJOUTÉ
} from '@heroicons/react/24/outline'
import { SparklesIcon } from '@heroicons/react/24/solid'

interface SidebarProps {
  onNavigate: (section: string) => void
  activeSection: string
  onLogout: () => void
  userName: string
  userRole: string
}

// ✅ Navigation principale
const navItems = [
  { id: 'overview', label: "Vue d'ensemble", icon: HomeIcon },
  { id: 'history', label: 'Historique', icon: ChartBarIcon },
  { id: 'codegen', label: 'Générer code', icon: QrCodeIcon },
  { id: 'students', label: 'Étudiants', icon: UsersIcon },
  { id: 'quiz', label: 'Quiz bibliques', icon: BookOpenIcon },
  { id: 'announcements', label: 'Annonces', icon: MegaphoneIcon },
]

const quickAccessItems = [
  { id: 'reports', label: 'Rapports', icon: DocumentChartBarIcon, color: 'text-blue-400', route: '/dashboard/superadmin/monthly-reports' },
  { id: 'live', label: 'LIVE', icon: null, color: 'text-green-400', isLive: true, route: '/dashboard/superadmin/online-users' },
  { id: 'rankings', label: 'Classement', icon: TrophyIcon, color: 'text-yellow-400', route: '/dashboard/superadmin/rankings' },
  { id: 'manual-notes', label: 'Notes manuelles', icon: PencilIcon, color: 'text-purple-400', route: '/dashboard/superadmin/manual-notes' },
  { id: 'promotions', label: 'Promotions', icon: AcademicCapIcon, color: 'text-emerald-400', route: '/dashboard/superadmin/promotions' },
]

// ✅ AJOUT DE WHATSAPP DANS ACTION ITEMS
const actionItems = [
  { id: 'chat', label: 'Chat', icon: ChatBubbleLeftRightIcon, color: 'text-cyan-400', route: '/dashboard/superadmin/chat' },
  { id: 'whatsapp', label: 'WhatsApp 📱', icon: PhoneIcon, color: 'text-green-400', route: '/dashboard/superadmin/whatsapp' }, // ✅ NOUVEAU
  { id: 'no-phone', label: 'Sans téléphone', icon: DevicePhoneMobileIcon, color: 'text-purple-400', route: '/dashboard/superadmin/no-phone' },
  { id: 'assisted', label: 'Présence assistée', icon: UserPlusIcon, color: 'text-indigo-400', route: '/dashboard/superadmin/assisted-attendance' },
]

export const Sidebar = ({ onNavigate, activeSection, onLogout, userName, userRole }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMobileOpen(false)
  }, [activeSection])

  const getInitials = (name: string) => {
    return name?.charAt(0)?.toUpperCase() || '?'
  }

  const handleQuickAccess = (route: string) => {
    router.push(route)
    setMobileOpen(false)
  }

  const sidebarClasses = `sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`

  return (
    <>
      <button 
        onClick={() => setMobileOpen(true)} 
        className="mobile-menu-btn"
        aria-label="Ouvrir le menu"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {mobileOpen && (
        <div className="sidebar-overlay active" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={sidebarClasses}>
        <div className="sidebar-logo">
          <div className="logo-icon">
            <SparklesIcon className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="logo-text">
              <p>Académie</p>
              <small>Super Admin</small>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="collapse-btn">
            {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Navigation</div>
          {navItems.map((item) => (
            <div
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
              {activeSection === item.id && <span className="nav-dot"></span>}
            </div>
          ))}

          <div className="nav-label" style={{ marginTop: '10px' }}>Accès rapide</div>
          {quickAccessItems.map((item) => (
            <div
              key={item.id}
              className={`nav-item ${item.color}`}
              onClick={() => handleQuickAccess(item.route)}
            >
              {item.isLive ? (
                <div className="pulse-dot"></div>
              ) : item.icon ? (
                <item.icon className="w-4 h-4" />
              ) : (
                <div className="w-4 h-4" />
              )}
              <span>{item.label}</span>
            </div>
          ))}

          <div className="nav-label" style={{ marginTop: '10px' }}>Actions</div>
          {actionItems.map((item) => (
            <div
              key={item.id}
              className={`nav-item ${item.color}`}
              onClick={() => handleQuickAccess(item.route)}
            >
              {item.icon ? (
                <item.icon className="w-4 h-4" />
              ) : (
                <div className="w-4 h-4" />
              )}
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar">{getInitials(userName)}</div>
          {!collapsed && (
            <div className="footer-text">
              <p>{userName?.split(' ')[0] || 'Admin'}</p>
              <small>{userRole === 'superadmin' ? 'superadmin' : 'admin'}</small>
            </div>
          )}
          <button onClick={onLogout} className="logout-btn">
            <ArrowLeftOnRectangleIcon className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  )
}
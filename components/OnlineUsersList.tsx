// components/OnlineUsersList.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { MagnifyingGlassIcon, FunnelIcon, UserGroupIcon, UserIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

interface OnlineUser {
  id: string
  user_id: string
  user_name: string
  user_role: string
  profile_image_url: string | null
  service_id: string | null
  service_name: string | null
  level: number | null
  branch: string | null
  is_online: boolean
  connected_at: string
  last_seen: string
  connected_duration: string | null
  last_seen_formatted: string
  current_page: string | null
}

export const OnlineUsersList = () => {
  const [users, setUsers] = useState<OnlineUser[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalOnline: 0, studentsOnline: 0, managersOnline: 0, mostActiveService: null })
  const [services, setServices] = useState<any[]>([])
  const [branches, setBranches] = useState<string[]>([])
  
  // Filtres
  const [showFilters, setShowFilters] = useState(false)
  const [roleFilter, setRoleFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      let url = `/api/live/online-users?`
      if (roleFilter !== 'all') url += `role=${roleFilter}&`
      if (serviceFilter !== 'all') url += `serviceId=${serviceFilter}&`
      if (levelFilter !== 'all') url += `level=${levelFilter}&`
      if (branchFilter !== 'all') url += `branch=${encodeURIComponent(branchFilter)}&`
      if (statusFilter !== 'all') url += `status=${statusFilter}&`
      
      const res = await fetch(url, { credentials: 'include' })
      const data = await res.json()
      
      if (res.ok) {
        setUsers(data.users || [])
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  const fetchServicesAndBranches = async () => {
    const { data: servicesData } = await supabase.from('services').select('id, name')
    if (servicesData) setServices(servicesData)
    
    const { data: studentsData } = await supabase.from('students').select('branch').is('deleted_at', null)
    if (studentsData) {
      const uniqueBranches = [...new Set(studentsData.map(s => s.branch))].sort()
      setBranches(uniqueBranches)
    }
  }

  useEffect(() => {
    fetchData()
    fetchServicesAndBranches()
    
    // Abonnement Realtime
    const channel = supabase
      .channel('online_users_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_users' }, () => {
        fetchData()
      })
      .subscribe()
    
    // Rafraîchissement toutes les 10 secondes
    const interval = setInterval(fetchData, 10000)
    
    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [roleFilter, serviceFilter, levelFilter, branchFilter, statusFilter])

  const filteredUsers = users.filter(user => {
    if (searchTerm === '') return true
    return user.user_name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const onlineUsers = filteredUsers.filter(u => u.is_online)
  const offlineUsers = filteredUsers.filter(u => !u.is_online)

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin': return '👑'
      case 'service_manager': return '⛪'
      default: return '📚'
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-purple-500/20 text-purple-300'
      case 'service_manager': return 'bg-blue-500/20 text-blue-300'
      default: return 'bg-green-500/20 text-green-300'
    }
  }

  const inputClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
  const selectClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08] rounded-xl p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-green-300">{stats.totalOnline}</div>
          <div className="text-[10px] sm:text-xs text-white/40">En ligne</div>
        </div>
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08] rounded-xl p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-blue-300">{stats.studentsOnline}</div>
          <div className="text-[10px] sm:text-xs text-white/40">Étudiants</div>
        </div>
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08] rounded-xl p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-2xl font-bold text-indigo-300">{stats.managersOnline}</div>
          <div className="text-[10px] sm:text-xs text-white/40">Responsables</div>
        </div>
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08] rounded-xl p-3 sm:p-4 text-center">
          <div className="text-sm sm:text-base font-bold text-yellow-300 truncate">{stats.mostActiveService || '-'}</div>
          <div className="text-[10px] sm:text-xs text-white/40">Service actif</div>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={inputClass + " pl-10"}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2.5 bg-white/10 text-white/80 rounded-lg text-sm hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
        >
          <FunnelIcon className="w-4 h-4" />
          Filtres
        </button>
      </div>

      {/* Panneau filtres */}
      {showFilters && (
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectClass}>
              <option value="all">Tous les rôles</option>
              <option value="superadmin">Super Admin</option>
              <option value="service_manager">Responsable</option>
              <option value="student">Étudiant</option>
            </select>
            <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} className={selectClass}>
              <option value="all">Tous les services</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className={selectClass}>
              <option value="all">Tous niveaux</option>
              <option value="1">Niveau 1</option>
              <option value="2">Niveau 2</option>
              <option value="3">Niveau 3</option>
            </select>
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className={selectClass}>
              <option value="all">Toutes branches</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
              <option value="all">Tous</option>
              <option value="online">🟢 En ligne</option>
              <option value="offline">⚫ Hors ligne</option>
            </select>
          </div>
        </div>
      )}

      {/* Section En ligne */}
      <div>
        <h3 className="text-base font-normal text-white mb-3 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          <span className="text-green-400">🟢</span> En ligne ({onlineUsers.length})
        </h3>
        
        {/* Version mobile */}
        <div className="block lg:hidden space-y-3">
          {onlineUsers.map(user => (
            <div key={user.id} className="bg-white/[0.04] border border-green-500/20 rounded-xl p-3">
              <div className="flex items-center gap-3">
                {user.profile_image_url ? (
                  <img src={user.profile_image_url} alt={user.user_name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-bold">{user.user_name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{user.user_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${getRoleBadge(user.user_role)}`}>
                      {getRoleIcon(user.user_role)} {user.user_role === 'superadmin' ? 'Admin' : user.user_role === 'service_manager' ? 'Manager' : 'Étudiant'}
                    </span>
                    {user.service_name && <span className="text-xs text-white/40">{user.service_name}</span>}
                  </div>
                  {user.current_page && (
                    <p className="text-xs text-blue-300/60 mt-1">📍 {user.current_page}</p>
                  )}
                  <p className="text-xs text-green-400/60 mt-1">Connecté depuis {user.connected_duration}</p>
                </div>
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
          {onlineUsers.length === 0 && (
            <p className="text-center text-white/40 py-4 text-sm">Aucun utilisateur en ligne</p>
          )}
        </div>

        {/* Version desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/[0.04]">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-white/40">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">Rôle</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">Service/Branche</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">Page actuelle</th>
                <th className="px-4 py-3 text-left text-xs text-white/40">Connecté depuis</th>
                <th className="px-4 py-3 text-center text-xs text-white/40">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {onlineUsers.map(user => (
                <tr key={user.id} className="hover:bg-white/[0.04]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.profile_image_url ? (
                        <img src={user.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                          <span className="text-xs font-bold">{user.user_name.charAt(0)}</span>
                        </div>
                      )}
                      <span className="text-sm text-white/80">{user.user_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(user.user_role)}`}>
                      {user.user_role === 'superadmin' ? 'Super Admin' : user.user_role === 'service_manager' ? 'Manager' : 'Étudiant'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-white/60">
                    {user.service_name || user.branch || '-'}
                    {user.level && <span className="text-xs text-white/40 ml-1">(Niv.{user.level})</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-blue-300/60">{user.current_page || '-'}</td>
                  <td className="px-4 py-3 text-sm text-green-300">{user.connected_duration || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping" />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section Hors ligne */}
      {offlineUsers.length > 0 && (
        <div>
          <h3 className="text-base font-normal text-white mb-3 flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            <span className="text-gray-400">⚫</span> Hors ligne ({offlineUsers.length})
          </h3>
          
          <div className="block lg:hidden space-y-3">
            {offlineUsers.slice(0, 10).map(user => (
              <div key={user.id} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 opacity-70">
                <div className="flex items-center gap-3">
                  {user.profile_image_url ? (
                    <img src={user.profile_image_url} alt={user.user_name} className="w-10 h-10 rounded-full object-cover grayscale" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                      <span className="text-sm font-bold text-white/40">{user.user_name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-white/60 font-medium text-sm">{user.user_name}</p>
                    <p className="text-xs text-white/30 mt-1">Dernière activité: {user.last_seen_formatted}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-white/[0.04]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-white/40">Utilisateur</th>
                  <th className="px-4 py-3 text-left text-xs text-white/40">Rôle</th>
                  <th className="px-4 py-3 text-left text-xs text-white/40">Dernière activité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {offlineUsers.slice(0, 20).map(user => (
                  <tr key={user.id} className="hover:bg-white/[0.02] opacity-60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.profile_image_url ? (
                          <img src={user.profile_image_url} alt="" className="w-8 h-8 rounded-full object-cover grayscale" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                            <span className="text-xs font-bold text-white/30">{user.user_name.charAt(0)}</span>
                          </div>
                        )}
                        <span className="text-sm text-white/50">{user.user_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/40">{user.user_role === 'superadmin' ? 'Super Admin' : user.user_role === 'service_manager' ? 'Manager' : 'Étudiant'}</td>
                    <td className="px-4 py-3 text-sm text-white/40">{user.last_seen_formatted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
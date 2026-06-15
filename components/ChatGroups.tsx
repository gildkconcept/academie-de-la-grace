'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { XMarkIcon, ChatBubbleLeftRightIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import axiosInstance from '@/lib/axios'  

interface ChatGroup {
  id: string
  name: string
  type: string
  branch?: string
  level?: number
  service_id?: string
  memberCount: number
  lastMessage?: {
    content: string
    senderName: string
    senderId: string
    senderType: string
    senderAvatar?: string
    time: string
  }
  unreadCount: number
}

interface ChatGroupsProps {
  onSelectGroup: (groupId: string, groupName: string) => void
  onClose: () => void
}

// Fonction pour obtenir les initiales - AVEC VÉRIFICATION
const getInitials = (name: string) => {
  if (!name || name.length === 0) {
    return '?'
  }
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Couleurs de fallback basées sur le nom - AVEC VÉRIFICATION
const getAvatarColor = (name: string) => {
  if (!name || name.length === 0) {
    return 'bg-gray-500'
  }
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash |= 0
  }
  return colors[Math.abs(hash) % colors.length]
}

// Badge rôle - AVEC VALEUR PAR DÉFAUT
const getRoleBadge = (senderType: string) => {
  const type = senderType || 'student'
  if (type === 'user' || type === 'superadmin') {
    return { label: 'Admin', color: 'bg-red-500/20 text-red-300' }
  }
  if (type === 'service_manager') {
    return { label: 'Manager', color: 'bg-blue-500/20 text-blue-300' }
  }
  return { label: 'Étudiant', color: 'bg-green-500/20 text-green-300' }
}

export const ChatGroups = ({ onSelectGroup, onClose }: ChatGroupsProps) => {
  const [groups, setGroups] = useState<ChatGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => { 
    fetchGroups() 
  }, [])

  // ✅ CORRIGÉ - Utiliser axiosInstance au lieu de fetch
  const fetchGroups = async () => {
    try {
      const response = await axiosInstance.get('/chat/groups')
      setGroups(response.data.groups || [])
    } catch (error) { 
      console.error('Erreur fetchGroups:', error) 
    } finally { 
      setLoading(false) 
    }
  }

  // ✅ CORRIGÉ - Utiliser axiosInstance au lieu de fetch
  const handleSelectGroup = async (groupId: string, groupName: string) => {
    try {
      await axiosInstance.post('/chat/mark-read', { groupId })
      await fetchGroups()
      onSelectGroup(groupId, groupName)
    } catch (error) {
      console.error('Erreur handleSelectGroup:', error)
      onSelectGroup(groupId, groupName)
    }
  }

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getGroupIcon = (type: string) => {
    switch (type) {
      case 'branch': return '🏛️'
      case 'level': return '📚'
      case 'service': return '⛪'
      case 'special': return '⭐'
      default: return '💬'
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    if (diff < 60000) return 'À l\'instant'
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
    if (diff < 86400000) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 md:right-4 md:top-16 w-full md:w-96 h-full md:h-[600px] md:max-h-[80vh] flex flex-col" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
        <div className="absolute inset-0 bg-cover bg-center md:rounded-xl" style={{ backgroundImage: "url('/ok.png')" }} />
        <div className="absolute inset-0 md:rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.97) 0%, rgba(15,45,130,0.95) 40%, rgba(10,30,100,0.96) 70%, rgba(4,12,65,0.98) 100%)' }} />
        
        <div className="relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-white/[0.08]">
            <div>
              <h3 className="font-normal text-white text-lg flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-300" /> Discussions
              </h3>
              <p className="text-xs text-white/50">{groups.length} groupe(s)</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
              <XMarkIcon className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Recherche */}
          <div className="p-3">
            <input
              type="text"
              placeholder="🔍 Rechercher un groupe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Liste des groupes */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12 text-white/40 text-sm">Aucun groupe trouvé</div>
            ) : (
              filteredGroups.map(group => (
                <div
                  key={group.id}
                  onClick={() => handleSelectGroup(group.id, group.name)}
                  className="p-4 border-b border-white/[0.05] hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getGroupIcon(group.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-white">{group.name}</span>
                        {group.lastMessage && (
                          <span className="text-xs text-white/30">{formatTime(group.lastMessage.time)}</span>
                        )}
                      </div>
                      
                      {/* Dernier message avec avatar et badge de rôle */}
                      {group.lastMessage && (
                        <div className="flex items-center gap-2 mt-1">
                          {group.lastMessage.senderAvatar ? (
                            <img 
                              src={group.lastMessage.senderAvatar} 
                              alt="" 
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className={`w-5 h-5 rounded-full ${getAvatarColor(group.lastMessage.senderName)} flex items-center justify-center`}>
                              <span className="text-[8px] text-white font-bold">
                                {getInitials(group.lastMessage.senderName)}
                              </span>
                            </div>
                          )}
                          
                          <span className={`text-[8px] px-1 py-0.5 rounded-full ${getRoleBadge(group.lastMessage.senderType).color}`}>
                            {getRoleBadge(group.lastMessage.senderType).label}
                          </span>
                          
                          <span className="text-xs text-white/50 truncate flex-1">
                            {group.lastMessage.senderName}: {group.lastMessage.content}
                          </span>
                        </div>
                      )}
                      
                      {!group.lastMessage && (
                        <span className="text-xs text-white/40 mt-1 block">Aucun message</span>
                      )}
                      
                      <div className="flex items-center gap-1 mt-2">
                        <UserGroupIcon className="w-3 h-3 text-white/30" />
                        <span className="text-xs text-white/30">{group.memberCount} membres</span>
                        {group.unreadCount > 0 && (
                          <span className="ml-2 bg-blue-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {group.unreadCount > 99 ? '99+' : group.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { XMarkIcon, ChatBubbleLeftRightIcon, UserGroupIcon } from '@heroicons/react/24/outline'

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
    time: string
  }
  unreadCount: number
}

interface ChatGroupsProps {
  onSelectGroup: (groupId: string, groupName: string) => void
  onClose: () => void
}

export const ChatGroups = ({ onSelectGroup, onClose }: ChatGroupsProps) => {
  const [groups, setGroups] = useState<ChatGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => { fetchGroups() }, [])

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/chat/groups', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) setGroups(data.groups || [])
    } catch (error) { console.error('Erreur:', error) }
    finally { setLoading(false) }
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
                  onClick={() => onSelectGroup(group.id, group.name)}
                  className="p-4 border-b border-white/[0.05] hover:bg-white/[0.04] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getGroupIcon(group.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-white">{group.name}</span>
                        {group.lastMessage && (
                          <span className="text-xs text-white/30">{formatTime(group.lastMessage.time)}</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-0.5">
                        {group.lastMessage ? (
                          <span className="text-xs text-white/50 truncate">
                            {group.lastMessage.senderName}: {group.lastMessage.content}
                          </span>
                        ) : (
                          <span className="text-xs text-white/40">Aucun message</span>
                        )}
                        {group.unreadCount > 0 && (
                          <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center ml-2">
                            {group.unreadCount > 99 ? '99+' : group.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <UserGroupIcon className="w-3 h-3 text-white/30" />
                        <span className="text-xs text-white/30">{group.memberCount}</span>
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
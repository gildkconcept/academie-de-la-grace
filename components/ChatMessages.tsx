'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeftIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'

interface Message {
  id: string
  sender_id: string
  sender_name: string
  sender_type: string
  sender_avatar?: string
  content: string
  type: string
  reply_to: string | null
  reply_to_message?: Message | null
  is_pinned: boolean
  is_edited: boolean
  is_deleted: boolean
  edited_at: string | null
  deleted_at: string | null
  created_at: string
}

interface ChatMessagesProps {
  groupId: string
  groupName: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar?: string
  onBack: () => void
}

// Fonction pour obtenir les initiales
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Couleurs de fallback basées sur le nom
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-violet-500'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash |= 0
  }
  return colors[Math.abs(hash) % colors.length]
}

// Badge rôle
const getRoleBadge = (senderType: string) => {
  if (senderType === 'user' || senderType === 'superadmin') {
    return { label: 'Admin', color: 'bg-red-500/20 text-red-300 border-red-500/30' }
  }
  if (senderType === 'service_manager') {
    return { label: 'Manager', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' }
  }
  return { label: 'Étudiant', color: 'bg-green-500/20 text-green-300 border-green-500/30' }
}

export const ChatMessages = ({ 
  groupId, 
  groupName, 
  currentUserId, 
  currentUserName, 
  currentUserAvatar,
  onBack 
}: ChatMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  // États pour la modification et la réponse
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editing, setEditing] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Marquer tous les messages du groupe comme lus
  const markMessagesAsRead = async () => {
    try {
      await fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupId })
      })
    } catch (error) {
      console.error('Erreur marquage lu:', error)
    }
  }

  useEffect(() => {
    fetchMessages()
    markMessagesAsRead()
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [groupId])

  // Marquer comme lu quand l'onglet redevient actif
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markMessagesAsRead()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [groupId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/messages?groupId=${groupId}&limit=50`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        const messagesData = data.messages || []
        const enrichedMessages = await enrichMessagesWithAvatars(messagesData)
        setMessages(enrichedMessages)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const enrichMessagesWithAvatars = async (messagesData: Message[]) => {
    const userIds = [...new Set(messagesData.map(m => m.sender_id))]
    const avatars: Record<string, string> = {}
    
    for (const userId of userIds) {
      const message = messagesData.find(m => m.sender_id === userId)
      const isStudent = message?.sender_type === 'student'
      const table = isStudent ? 'students' : 'users'
      
      const { data } = await supabase
        .from(table)
        .select('profile_image_url')
        .eq('id', userId)
        .single()
      
      if (data?.profile_image_url) {
        avatars[userId] = data.profile_image_url
      }
    }
    
    return messagesData.map(msg => ({
      ...msg,
      sender_avatar: avatars[msg.sender_id]
    }))
  }

  // Modifier un message
  const editMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim() || editing) return
    
    setEditing(true)
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageId, content: newContent })
      })
      
      if (res.ok) {
        setEditingMessage(null)
        setEditContent('')
        fetchMessages()
      } else {
        const data = await res.json()
        alert(data.error || 'Erreur lors de la modification')
      }
    } catch (error) {
      console.error('Erreur modification:', error)
      alert('Erreur réseau')
    } finally {
      setEditing(false)
    }
  }

  // Supprimer un message
  const deleteMessage = async (messageId: string) => {
    if (!confirm('⚠️ Voulez-vous vraiment supprimer ce message ? Cette action est irréversible.')) return
    
    setDeleting(messageId)
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageId })
      })
      
      if (res.ok) {
        fetchMessages()
      } else {
        const data = await res.json()
        alert(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur suppression:', error)
      alert('Erreur réseau')
    } finally {
      setDeleting(null)
    }
  }

  // Annuler l'édition
  const cancelEdit = () => {
    setEditingMessage(null)
    setEditContent('')
  }

  // Annuler la réponse
  const cancelReply = () => {
    setReplyTo(null)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return
    
    setSending(true)
    try {
      const body: any = { 
        groupId, 
        content: newMessage, 
        type: 'text' 
      }
      
      if (replyTo) {
        body.replyTo = replyTo.id
      }
      
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })
      
      if (res.ok) {
        setNewMessage('')
        setReplyTo(null)
        fetchMessages()
        markMessagesAsRead()
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  }

  const isMine = (senderId: string) => senderId === currentUserId

  // Grouper les messages par date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toLocaleDateString('fr-FR')
    if (!groups[date]) groups[date] = []
    groups[date].push(message)
    return groups
  }, {} as Record<string, Message[]>)

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm md:hidden" onClick={onBack} />
        <div className="absolute inset-0 md:right-4 md:top-16 md:inset-auto md:w-96 md:h-[600px] md:max-h-[80vh] flex flex-col md:rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/ok.png')" }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.97) 0%, rgba(15,45,130,0.95) 40%, rgba(10,30,100,0.96) 70%, rgba(4,12,65,0.98) 100%)' }} />
          
          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-white/[0.08]">
              <button onClick={onBack} className="p-1 hover:bg-white/10 rounded-lg">
                <ArrowLeftIcon className="w-5 h-5 text-white/60" />
              </button>
              <div className="flex-1">
                <h3 className="text-white text-sm font-medium">{groupName}</h3>
                <p className="text-white/40 text-xs">{messages.length} messages</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>
              ) : messages.length === 0 ? (
                <p className="text-center text-white/40 text-sm py-8">Aucun message. Soyez le premier à écrire !</p>
              ) : (
                Object.entries(groupedMessages).map(([date, dateMessages]) => (
                  <div key={date}>
                    <div className="text-center my-3">
                      <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded-full">{date}</span>
                    </div>
                    {dateMessages.map((msg) => {
                      const roleBadge = getRoleBadge(msg.sender_type)
                      const avatarColor = getAvatarColor(msg.sender_name)
                      const isCurrentUser = isMine(msg.sender_id)
                      const isDeleted = msg.is_deleted === true
                      
                      return (
                        <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3`}>
                          <div className={`flex gap-2 max-w-[80%] ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {msg.sender_avatar ? (
                                <img
                                  src={msg.sender_avatar}
                                  alt={msg.sender_name}
                                  className="w-9 h-9 rounded-full object-cover border-2 border-white/20 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setImagePreview(msg.sender_avatar!)}
                                  loading="lazy"
                                />
                              ) : (
                                <div 
                                  className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity border-2 border-white/20`}
                                >
                                  <span className="text-white text-xs font-bold">
                                    {getInitials(msg.sender_name)}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {/* Contenu du message */}
                            <div className={`flex-1 ${isCurrentUser ? 'items-end' : ''}`}>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-white text-xs font-medium">{msg.sender_name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${roleBadge.color}`}>
                                  {roleBadge.label}
                                </span>
                                <span className="text-white/30 text-[10px]">{formatTime(msg.created_at)}</span>
                              </div>
                              
                              {/* Message cité (reply) */}
                              {msg.reply_to_message && !msg.reply_to_message.is_deleted && (
                                <div className="mb-2 p-2 bg-white/05 rounded-lg border-l-2 border-blue-400/50 text-xs">
                                  <p className="text-blue-300/70 font-medium">
                                    En réponse à {msg.reply_to_message.sender_name}:
                                  </p>
                                  <p className="text-white/50 italic line-clamp-2">
                                    "{msg.reply_to_message.content?.substring(0, 80)}"
                                  </p>
                                </div>
                              )}
                              
                              {/* Message cité supprimé */}
                              {msg.reply_to_message?.is_deleted && (
                                <div className="mb-2 p-2 bg-white/05 rounded-lg border-l-2 border-red-400/50 text-xs">
                                  <p className="text-red-300/70 font-medium">
                                    En réponse à {msg.reply_to_message.sender_name}:
                                  </p>
                                  <p className="text-red-400/50 italic">(message supprimé)</p>
                                </div>
                              )}
                              
                              {/* Contenu ou message supprimé */}
                              {isDeleted ? (
                                <div className={`p-3 rounded-2xl text-sm italic ${
                                  isCurrentUser
                                    ? 'bg-indigo-500/20 text-white/50 rounded-br-md'
                                    : 'bg-white/[0.05] text-white/40 rounded-bl-md'
                                }`}>
                                  🗑️ Message supprimé
                                </div>
                              ) : editingMessage?.id === msg.id ? (
                                <div className="mt-1">
                                  <input
                                    type="text"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full p-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        editMessage(msg.id, editContent)
                                      } else if (e.key === 'Escape') {
                                        cancelEdit()
                                      }
                                    }}
                                  />
                                  <div className="flex gap-2 mt-1">
                                    <button
                                      onClick={() => editMessage(msg.id, editContent)}
                                      disabled={editing}
                                      className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded"
                                    >
                                      {editing ? 'Envoi...' : '💾 Enregistrer'}
                                    </button>
                                    <button
                                      onClick={cancelEdit}
                                      className="text-xs px-2 py-1 bg-white/10 text-white/70 rounded"
                                    >
                                      ❌ Annuler
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className={`p-3 rounded-2xl text-sm ${
                                  isCurrentUser
                                    ? 'bg-indigo-500/30 text-white rounded-br-md'
                                    : 'bg-white/[0.08] text-white/90 rounded-bl-md'
                                }`}>
                                  {msg.content}
                                  {msg.is_edited && (
                                    <span className="text-[10px] text-white/30 ml-2">(modifié)</span>
                                  )}
                                </div>
                              )}
                              
                              {/* Boutons d'action (uniquement pour l'auteur et message non supprimé) */}
                              {!isDeleted && isCurrentUser && !editingMessage && (
                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    onClick={() => {
                                      setEditingMessage(msg)
                                      setEditContent(msg.content || '')
                                    }}
                                    className="text-[10px] text-white/40 hover:text-blue-300 transition-colors"
                                  >
                                    ✏️ Modifier
                                  </button>
                                  <button
                                    onClick={() => deleteMessage(msg.id)}
                                    disabled={deleting === msg.id}
                                    className="text-[10px] text-white/40 hover:text-red-400 transition-colors"
                                  >
                                    {deleting === msg.id ? '...' : '🗑️ Supprimer'}
                                  </button>
                                  <button
                                    onClick={() => setReplyTo(msg)}
                                    className="text-[10px] text-white/40 hover:text-green-300 transition-colors"
                                  >
                                    💬 Répondre
                                  </button>
                                </div>
                              )}
                              
                              {/* Bouton Répondre pour les autres utilisateurs */}
                              {!isDeleted && !isCurrentUser && !editingMessage && (
                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    onClick={() => setReplyTo(msg)}
                                    className="text-[10px] text-white/40 hover:text-green-300 transition-colors"
                                  >
                                    💬 Répondre
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Indicateur de réponse */}
            {replyTo && (
              <div className="p-2 border-t border-white/[0.08] bg-white/5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex-1">
                    <span className="text-blue-300">Réponse à {replyTo.sender_name}:</span>
                    <p className="text-white/50 italic text-[10px] truncate">
                      "{replyTo.content?.substring(0, 50)}"
                    </p>
                  </div>
                  <button onClick={cancelReply} className="text-white/40 hover:text-white ml-2">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-white/[0.08]">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={replyTo ? `Répondre à ${replyTo.sender_name}...` : "Écrire un message..."}
                  className="flex-1 p-2.5 bg-white/90 border border-white/30 rounded-full text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 bg-white text-[#1a3a8f] rounded-full hover:shadow-lg transition-all disabled:opacity-50"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal preview image */}
      {imagePreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-60 p-4" onClick={() => setImagePreview(null)}>
          <div className="relative max-w-lg w-full">
            <img src={imagePreview} alt="Preview" className="w-full rounded-lg" />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
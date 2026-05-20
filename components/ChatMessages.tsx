'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowLeftIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Message {
  id: string
  sender_id: string
  sender_name: string
  sender_type: string
  content: string
  type: string
  reply_to: string | null
  is_pinned: boolean
  created_at: string
}

interface ChatMessagesProps {
  groupId: string
  groupName: string
  currentUserId: string
  currentUserName: string
  onBack: () => void
}

export const ChatMessages = ({ groupId, groupName, currentUserId, currentUserName, onBack }: ChatMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [groupId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/messages?groupId=${groupId}&limit=50`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) setMessages(data.messages || [])
    } catch (error) { console.error('Erreur:', error) }
    finally { setLoading(false) }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ groupId, content: newMessage, type: 'text' })
      })
      if (res.ok) {
        setNewMessage('')
        fetchMessages()
      }
    } catch (error) { console.error('Erreur:', error) }
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  }

  const isMine = (senderId: string) => senderId === currentUserId

  return (
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>
            ) : messages.length === 0 ? (
              <p className="text-center text-white/40 text-sm py-8">Aucun message. Soyez le premier à écrire !</p>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${isMine(msg.sender_id) ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${isMine(msg.sender_id) ? 'order-1' : ''}`}>
                    {!isMine(msg.sender_id) && (
                      <span className="text-xs text-white/50 block mb-1">{msg.sender_name}</span>
                    )}
                    <div className={`p-3 rounded-2xl text-sm ${
                      isMine(msg.sender_id)
                        ? 'bg-indigo-500/30 text-white rounded-br-md'
                        : 'bg-white/[0.08] text-white/90 rounded-bl-md'
                    }`}>
                      {msg.content}
                    </div>
                    <div className={`text-[10px] text-white/30 mt-0.5 ${isMine(msg.sender_id) ? 'text-right' : ''}`}>
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/[0.08]">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Écrire un message..."
                className="flex-1 p-2.5 bg-white/90 border border-white/30 rounded-full text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="p-2.5 bg-white text-[#1a3a8f] rounded-full hover:shadow-lg transition-all disabled:opacity-50"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ClipboardIcon, ShareIcon, HeartIcon } from '@heroicons/react/24/outline'

interface DailyVerse {
  id: string
  verse: string
  reference: string
  displayed_date: string
}

export const DailyVerseCard = () => {
  const [verse, setVerse] = useState<DailyVerse | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    fetchDailyVerse()
    setTimeout(() => setVisible(true), 100)
  }, [])

  const fetchDailyVerse = async () => {
    try {
      const res = await fetch('/api/daily-verse', { credentials: 'include' })
      const data = await res.json()
      if (res.ok && data.verse) {
        setVerse(data.verse)
      }
    } catch (error) {
      console.error('Erreur verset:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyVerse = () => {
    if (verse) {
      navigator.clipboard.writeText(`"${verse.verse}" - ${verse.reference}`)
      toast.success('Verset copié !')
    }
  }

  const shareVerse = async () => {
    if (verse && navigator.share) {
      try {
        await navigator.share({
          title: 'Verset du jour',
          text: `"${verse.verse}" - ${verse.reference}`,
          url: window.location.href
        })
      } catch (error) {
        // L'utilisateur a annulé
      }
    } else {
      copyVerse()
    }
  }

  if (loading) {
    return (
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/4 mb-4"></div>
        <div className="h-3 bg-white/10 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-white/10 rounded w-1/2"></div>
      </div>
    )
  }

  if (!verse) return null

  return (
    <div 
      className={`relative overflow-hidden bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-5 sm:p-6 mb-6 transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ fontFamily: "'Crimson Text', Georgia, serif" }}
    >
      {/* Effet glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-400/8 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <h3 className="text-sm font-medium text-blue-200/90 tracking-wide uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>
              Verset du jour
            </h3>
          </div>
          <span className="text-xs text-white/30">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>

        {/* Verset */}
        <blockquote className="mb-3">
          <p className="text-white/90 text-base sm:text-lg leading-relaxed italic">
            &ldquo;{verse.verse}&rdquo;
          </p>
        </blockquote>

        {/* Référence + Actions */}
        <div className="flex items-center justify-between">
          <p className="text-blue-300/80 text-sm font-medium">
            — {verse.reference}
          </p>
          <div className="flex items-center gap-1">
            {/* Favori */}
            <button
              onClick={() => { setLiked(!liked); toast.success(liked ? 'Retiré des favoris' : 'Ajouté aux favoris') }}
              className={`p-2 rounded-lg transition-all ${liked ? 'text-red-400' : 'text-white/40 hover:text-white/70'}`}
              title="Favori"
            >
              <HeartIcon className={`w-4 h-4 ${liked ? 'fill-red-400' : ''}`} />
            </button>
            {/* Copier */}
            <button
              onClick={copyVerse}
              className="p-2 text-white/40 hover:text-white/70 rounded-lg transition-colors"
              title="Copier"
            >
              <ClipboardIcon className="w-4 h-4" />
            </button>
            {/* Partager */}
            <button
              onClick={shareVerse}
              className="p-2 text-white/40 hover:text-white/70 rounded-lg transition-colors"
              title="Partager"
            >
              <ShareIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
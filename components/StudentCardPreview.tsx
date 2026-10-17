// components/StudentCardPreview.tsx
// Aperçu de la carte d'étudiant sur le tableau de bord.
// IMPORTANT : en cas de problème (réseau, fonctionnalité pas encore activée côté serveur…),
// ce composant n'affiche RIEN. Il ne peut donc jamais perturber le reste du tableau de bord.
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { IdentificationIcon } from '@heroicons/react/24/outline'
import { cardService, MyCard } from '../../academie-de-la-grace/services/cardService'

export function StudentCardPreview() {
  const [data, setData] = useState<MyCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)€
  const [photoFailed, setPhotoFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    try {
      cardService
        .getMyCard()
        .then((res) => {
          if (!cancelled) setData(res)
        })
        .catch(() => {
          if (!cancelled) setFailed(true)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    } catch {
      // Erreur immédiate (par exemple service indisponible) : on masque l'aperçu
      // au lieu de faire planter tout le tableau de bord.
      setFailed(true)
      setLoading(false)
    }
    return () => {
      cancelled = true
    }
  }, [])

  if (failed) return null

  if (loading) {
    return (
      <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4 mb-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-white/10" />
            <div className="h-3 w-1/2 rounded bg-white/10" />
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const revoked = data.card.status === 'revoked'
  const showPhoto = !!data.student.profileImageUrl && !photoFailed
  const initials = data.student.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4 mb-4">
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-white/80 text-lg font-semibold"
          style={{ border: '2px solid #e0b84a', background: 'rgba(255,255,255,0.08)' }}
        >
          {showPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.student.profileImageUrl as string}
              alt={data.student.fullName}
              onError={() => setPhotoFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            initials || <IdentificationIcon className="w-6 h-6" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider" style={{ color: '#e0b84a' }}>
            Carte d&apos;étudiant
          </p>
          <p className="text-white text-base font-medium truncate">{data.student.fullName}</p>
          <p className="text-white/50 text-xs">
            N° {data.card.cardNumber}
            {revoked && <span className="ml-2 text-red-300">· Révoquée</span>}
          </p>
        </div>

        <Link
          href="/dashboard/student/card"
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#0b1a5c] hover:opacity-90 transition-opacity"
          style={{ background: '#e0b84a' }}
        >
          <IdentificationIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Voir ma carte</span>
          <span className="sm:hidden">Voir</span>
        </Link>
      </div>
    </div>
  )
}
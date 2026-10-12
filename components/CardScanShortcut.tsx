// components/CardScanShortcut.tsx
// Raccourci flottant « Scanner les cartes », visible uniquement pour le superadmin.
'use client'

import Link from 'next/link'
import { CameraIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'

export function CardScanShortcut() {
  const { user } = useAuth()
  if (!user || user.role !== 'superadmin') return null

  return (
    <Link
      href="/dashboard/superadmin/scan"
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full shadow-xl text-sm font-semibold text-[#0b1a5c] hover:opacity-90 active:scale-95 transition"
      style={{ background: '#e0b84a' }}
      aria-label="Scanner les cartes étudiant"
    >
      <CameraIcon className="w-5 h-5" />
      <span>Scanner les cartes</span>
    </Link>
  )
}
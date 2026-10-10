// app/verify/[token]/layout.tsx
// Page publique : non indexée, et sans "Referer" (le jeton de la carte ne doit pas fuiter
// vers les sites tiers, par exemple le stockage des photos).
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vérification de carte étudiant — Académie de la Grâce',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children
}
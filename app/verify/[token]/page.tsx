// app/verify/[token]/page.tsx
// Page PUBLIQUE de vérification d'une carte étudiant (ouverte en scannant le QR code).
// Aucune connexion requise. N'affiche que : statut, numéro de carte, nom et photo.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { cardService, VerifyResult } from '@/services/cardService'

function formatDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const VIEW: Record<string, { icon: string; title: string; text: string; color: string; bg: string }> = {
  valid: { icon: '✅', title: 'Carte valide', text: "Cette carte est authentique et en cours de validité.", color: '#86efac', bg: 'rgba(34,197,94,0.12)' },
  revoked: { icon: '⛔', title: 'Carte révoquée', text: "Cette carte n'est plus valide. Ne l'acceptez pas comme justificatif.", color: '#fca5a5', bg: 'rgba(239,68,68,0.14)' },
  invalid: { icon: '⚠️', title: 'Carte invalide', text: "Cette carte n'est plus associée à un étudiant actif.", color: '#fdba74', bg: 'rgba(249,115,22,0.14)' },
  unknown: { icon: '❓', title: 'Carte inconnue', text: "Aucune carte ne correspond à ce QR code. Il peut s'agir d'une contrefaçon.", color: '#fcd34d', bg: 'rgba(245,158,11,0.14)' },
  unavailable: { icon: '🔧', title: 'Vérification indisponible', text: 'Le service de vérification est momentanément indisponible. Réessayez dans un instant.', color: '#cbd5e1', bg: 'rgba(148,163,184,0.14)' },
  rate_limited: { icon: '⏳', title: 'Trop de vérifications', text: 'Patientez une minute puis réessayez.', color: '#cbd5e1', bg: 'rgba(148,163,184,0.14)' },
  error: { icon: '📡', title: 'Vérification impossible', text: 'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.', color: '#cbd5e1', bg: 'rgba(148,163,184,0.14)' },
}

export default function VerifyCardPage() {
  const params = useParams<{ token: string }>()
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [photoFailed, setPhotoFailed] = useState(false)

  const verify = useCallback(async () => {
    if (!token) {
      // Lien sans jeton : on l'indique au lieu de tourner indéfiniment
      setResult({ valid: false, status: 'unknown' })
      setLoading(false)
      return
    }
    setLoading(true)
    setPhotoFailed(false)
    setResult(await cardService.verify(token))
    setLoading(false)
  }, [token])

  useEffect(() => {
    verify()
  }, [verify])

  // Une carte n'est présentée comme valide que si le serveur le confirme explicitement
  const isValid = result?.valid === true && result.status === 'valid'
  const view = VIEW[isValid ? 'valid' : result?.status && VIEW[result.status] && result.status !== 'valid' ? result.status : 'error']

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(135deg, #0a1a5a 0%, #0f2d82 50%, #0a1e64 100%)', fontFamily: "'Crimson Text', Georgia, serif" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-5">
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#e0b84a' }}>Académie de la Grâce · MEGA</p>
          <h1 className="text-2xl text-white mt-1" style={{ fontFamily: "'Playfair Display', serif" }}>
            Vérification de carte étudiant
          </h1>
        </div>

        <div className="bg-white/[0.07] backdrop-blur-2xl border border-white/[0.12] rounded-2xl p-6 text-center">
          {loading ? (
            <div className="py-10">
              <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-white/60 text-sm mt-4">Vérification en cours…</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl py-4 px-3 mb-5" style={{ background: view.bg }}>
                <div className="text-4xl mb-1">{view.icon}</div>
                <p className="text-xl font-semibold" style={{ color: view.color }}>{view.title}</p>
                <p className="text-white/70 text-sm mt-1">{view.text}</p>
              </div>

              {isValid && result?.student && (
                <div className="flex flex-col items-center">
                  <div
                    className="w-28 h-36 rounded-xl overflow-hidden flex items-center justify-center text-white/50 text-xs"
                    style={{ border: '2.5px solid #e0b84a', background: 'rgba(255,255,255,0.08)' }}
                  >
                    {result.student.photoUrl && !photoFailed ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={result.student.photoUrl}
                        alt={result.student.fullName}
                        referrerPolicy="no-referrer"
                        onError={() => setPhotoFailed(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="px-2">Photo non renseignée</span>
                    )}
                  </div>
                  <p className="text-white text-xl mt-4 font-medium">{result.student.fullName}</p>
                  {result.cardNumber && <p className="text-sm mt-1" style={{ color: '#e0b84a' }}>N° {result.cardNumber}</p>}
                  {result.issuedAt && <p className="text-white/50 text-xs mt-1">Carte émise le {formatDate(result.issuedAt)}</p>}
                  <p className="text-white/40 text-xs mt-5">
                    Comparez le nom et le visage avec la personne qui présente la carte.
                  </p>
                </div>
              )}

              {!isValid && result?.cardNumber && (
                <p className="text-white/50 text-sm">Carte n° {result.cardNumber}</p>
              )}

              {(result?.status === 'unavailable' || result?.status === 'error' || result?.status === 'rate_limited') && (
                <button
                  onClick={verify}
                  className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors"
                >
                  Réessayer
                </button>
              )}
            </>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-4">
          Cette page confirme uniquement l&apos;authenticité de la carte.
        </p>
      </div>
    </div>
  )
}
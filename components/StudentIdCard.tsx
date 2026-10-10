// components/StudentIdCard.tsx
// Carte d'étudiant (aspect carte bancaire). Dessinée à taille fixe puis redimensionnée pour
// s'adapter à la largeur de l'écran : la mise en page reste identique sur téléphone, tablette et PC.
'use client'

import { useEffect, useRef, useState } from 'react'
import type { MyCard } from '@/services/cardService'

const DESIGN_W = 428 // 85,6 mm x 5
const DESIGN_H = 270 // 54 mm x 5

interface StudentIdCardProps {
  card: MyCard['card']
  student: MyCard['student']
  qrDataUrl: string | null
}

const GOLD = '#e0b84a'
const MUTED = '#a0b0eb'

function Label({ children, left, top }: { children: React.ReactNode; left: number; top: number }) {
  return (
    <div
      className="absolute uppercase"
      style={{ left, top, fontSize: 8, letterSpacing: '0.12em', color: MUTED, fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {children}
    </div>
  )
}

function Value({
  children,
  left,
  top,
  width,
  size = 14,
  color = '#ffffff',
}: {
  children: React.ReactNode
  left: number
  top: number
  width: number
  size?: number
  color?: string
}) {
  return (
    <div
      className="absolute truncate font-bold"
      style={{ left, top, width, fontSize: size, lineHeight: '18px', color, fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {children}
    </div>
  )
}

export function StudentIdCard({ card, student, qrDataUrl }: StudentIdCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.7)
  const [photoFailed, setPhotoFailed] = useState(false)
  const [logoOk, setLogoOk] = useState(true)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => {
      if (el.clientWidth > 0) setScale(el.clientWidth / DESIGN_W)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setPhotoFailed(false)
  }, [student.profileImageUrl])

  const revoked = card.status === 'revoked'
  const showPhoto = !!student.profileImageUrl && !photoFailed
  const rowTop = (i: number) => 76.5 + i * 37.5
  const valueTop = (i: number) => rowTop(i) + 11

  return (
    <div ref={wrapRef} className="w-full max-w-[520px] mx-auto" style={{ height: DESIGN_H * scale }}>
      <div
        className="relative overflow-hidden shadow-2xl"
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          borderRadius: 15,
          background:
            'radial-gradient(circle at 88% 8%, rgba(224,184,74,0.20), transparent 42%), linear-gradient(135deg, #12308f 0%, #0b1a5c 55%, #060f45 100%)',
          filter: revoked ? 'grayscale(0.85)' : undefined,
        }}
      >
        {/* En-tête */}
        {logoOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/logo-academie.png"
            alt=""
            onError={() => setLogoOk(false)}
            className="absolute"
            style={{ left: 18, top: 9, width: 40, height: 40, objectFit: 'contain' }}
          />
        ) : (
          <div
            className="absolute flex items-center justify-center font-bold"
            style={{ left: 20, top: 11, width: 34, height: 34, borderRadius: 17, background: GOLD, color: '#0b1a5c', fontSize: 15, fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            AG
          </div>
        )}
        <div className="absolute font-bold" style={{ left: 67, top: 12, fontSize: 14, letterSpacing: '0.05em', color: GOLD, fontFamily: 'Arial, Helvetica, sans-serif' }}>
          ACADÉMIE DE LA GRÂCE
        </div>
        <div className="absolute" style={{ left: 67, top: 31, fontSize: 10, color: MUTED, fontFamily: 'Arial, Helvetica, sans-serif' }}>
          Carte d&apos;étudiant · MEGA
        </div>
        <div className="absolute" style={{ left: 20, top: 56, width: 388, height: 2, background: GOLD }} />

        {/* Photo */}
        <div
          className="absolute overflow-hidden"
          style={{ left: 25, top: 75, width: 105, height: 130, borderRadius: 8, border: `2.5px solid ${GOLD}`, background: '#162a7d' }}
        >
          {showPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={student.profileImageUrl as string}
              alt={student.fullName}
              onError={() => setPhotoFailed(true)}
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <svg viewBox="0 0 105 130" width="100%" height="100%" aria-label="Photo non renseignée">
              <circle cx="52.5" cy="52" r="21" fill={MUTED} />
              <rect x="17" y="77" width="71" height="50" rx="25" fill={MUTED} />
            </svg>
          )}
        </div>
        {!showPhoto && (
          <div className="absolute text-center" style={{ left: 25, top: 210, width: 105, fontSize: 9, color: MUTED, fontFamily: 'Arial, Helvetica, sans-serif' }}>
            Photo non renseignée
          </div>
        )}

        {/* Informations */}
        <Label left={150} top={rowTop(0)}>Nom et prénoms</Label>
        <Value left={150} top={valueTop(0)} width={255} size={student.fullName.length > 26 ? 12 : 15}>{student.fullName}</Value>

        <Label left={150} top={rowTop(1)}>Service</Label>
        <Value left={150} top={valueTop(1)} width={255}>{student.serviceName || '-'}</Value>

        <Label left={150} top={rowTop(2)}>Branche</Label>
        <Value left={150} top={valueTop(2)} width={135}>{student.branch || '-'}</Value>

        <Label left={150} top={rowTop(3)}>Niveau</Label>
        <Value left={150} top={valueTop(3)} width={75}>{student.level ? `Niveau ${student.level}` : '-'}</Value>

        <Label left={230} top={rowTop(3)}>Statut</Label>
        <Value left={230} top={valueTop(3)} width={65} size={13} color={revoked ? '#ff8282' : '#78dc96'}>
          {revoked ? 'Révoquée' : 'Active'}
        </Value>

        <Label left={150} top={rowTop(4)}>N° étudiant</Label>
        <Value left={150} top={valueTop(4)} width={135} color={GOLD}>{card.cardNumber}</Value>

        {/* QR code */}
        <div className="absolute bg-white" style={{ left: 300, top: 145, width: 108, height: 108, borderRadius: 7 }}>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR code de vérification" style={{ position: 'absolute', left: 6.5, top: 6.5, width: 95, height: 95 }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400" style={{ fontSize: 10 }}>QR…</div>
          )}
        </div>
        <div className="absolute text-center" style={{ left: 300, top: 256, width: 108, fontSize: 8, color: MUTED, fontFamily: 'Arial, Helvetica, sans-serif' }}>
          Scanner pour vérifier
        </div>

        {/* Bandeau carte révoquée */}
        {revoked && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <div
              className="font-bold text-white"
              style={{ transform: 'rotate(-12deg)', background: '#dc2626', padding: '8px 36px', fontSize: 34, letterSpacing: '0.12em', fontFamily: 'Arial, Helvetica, sans-serif' }}
            >
              RÉVOQUÉE
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
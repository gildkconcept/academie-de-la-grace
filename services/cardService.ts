// services/cardService.ts
// Carte d'identité numérique de l'étudiant.
import axiosInstance from '@/lib/axios'

export type CardStatus = 'active' | 'revoked'

export interface MyCard {
  card: {
    cardNumber: string
    status: CardStatus
    issuedAt: string
    verifyToken: string
  }
  student: {
    fullName: string
    firstName: string | null
    lastName: string | null
    branch: string | null
    level: number | null
    serviceName: string | null
    profileImageUrl: string | null
  }
}

export type VerifyStatus =
  | 'valid'
  | 'revoked'
  | 'invalid'
  | 'unknown'
  | 'unavailable'
  | 'rate_limited'
  | 'error'

export interface VerifyResult {
  valid: boolean
  status: VerifyStatus
  cardNumber?: string
  issuedAt?: string
  revokedAt?: string | null
  student?: { fullName: string; photoUrl: string | null }
}

// Même adresse que lib/axios.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://85.31.238.112:3001'

// Adresse de la page de vérification qui sera encodée dans le QR code.
// Pour des cartes imprimées, définissez NEXT_PUBLIC_SITE_URL (adresse de production du site)
// afin que le QR ne contienne jamais l'adresse d'un aperçu Vercel.
export function getVerifyUrl(token: string): string {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  ).replace(/\/+$/, '')
  return `${base}/verify/${token}`
}

export const cardService = {
  // Carte de l'étudiant connecté (authentifié)
  async getMyCard(): Promise<MyCard> {
    const { data } = await axiosInstance.get('/cards/me')
    return data
  },

  // Vérification PUBLIQUE (aucune connexion requise).
  // On utilise fetch et non axiosInstance : l'intercepteur d'axios redirigerait un visiteur
  // non connecté vers /login en cas de 401, ce qui est exactement ce qu'il ne faut pas ici.
  async verify(token: string): Promise<VerifyResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(`${API_URL}/api/cards/verify/${encodeURIComponent(token)}`, {
        method: 'GET',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
      })
      const data = await res.json().catch(() => null)
      if (data && typeof data.status === 'string') return data as VerifyResult
      return { valid: false, status: 'error' }
    } catch {
      return { valid: false, status: 'error' }
    } finally {
      clearTimeout(timer)
    }
  },
}
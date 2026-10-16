// services/cardScanService.ts
// Pointage des présences par scan de carte (superadmin).
import axiosInstance from '@/lib/axios'

export interface AttendanceCounts {
  present: number
  late: number
  absent: number
  byMethod: Record<string, number>
}

export interface ScanSession {
  id: string
  code: string
  date: string
  level: number | null
  createdAt: string
  expiresAt: string
  codeOpen: boolean
  counts: AttendanceCounts
}

export type ScanOutcome =
  | 'recorded'
  | 'upgraded'
  | 'already_present'
  | 'not_eligible'
  | 'invalid_card'
  | 'revoked'
  | 'session_closed'
  | 'session_not_found'
  | 'technical'
  | 'rate_limited'
  | 'network_error'

export interface ScanStudent {
  fullName: string
  photoUrl: string | null
  branch: string | null
  serviceName: string | null
  level: number | null
  cardNumber: string
}

export interface ScanResult {
  ok: boolean
  outcome: ScanOutcome
  message: string
  student?: ScanStudent
  card?: { cardNumber: string }
  previous?: { status: string; method: string | null; at: string | null }
  scannedAt?: string
  reason?: string
}

export interface AttendanceItem {
  studentId: string | null
  fullName: string
  photoUrl: string | null
  branch: string | null
  serviceName: string | null
  level: number | null
  status: string
  method: string | null
  scannedAt: string
}

export interface SessionAttendance {
  session: { id: string; code: string; date: string; level: number | null; expiresAt: string }
  counts: AttendanceCounts
  items: AttendanceItem[]
}

export const cardScanService = {
  async listSessions(): Promise<ScanSession[]> {
    const { data } = await axiosInstance.get('/card-scan/sessions')
    return data.sessions || []
  },

  async getAttendance(sessionId: string): Promise<SessionAttendance> {
    const { data } = await axiosInstance.get(`/card-scan/sessions/${sessionId}/attendance`)
    return data
  },

  // Ne lève jamais d'erreur : renvoie toujours un résultat affichable
  async scan(sessionId: string, token: string): Promise<ScanResult> {
    try {
      const { data } = await axiosInstance.post('/card-scan/scan', { sessionId, token })
      return data as ScanResult
    } catch (error: any) {
      const data = error?.response?.data
      if (data && typeof data.outcome === 'string') return data as ScanResult
      if (error?.response) {
        return {
          ok: false,
          outcome: 'technical',
          message: data?.message || data?.error || "Impossible d'enregistrer la présence, veuillez réessayer",
        }
      }
      return {
        ok: false,
        outcome: 'network_error',
        message: "Connexion perdue : la présence n'a PAS été enregistrée. Réessayez.",
      }
    }
  },

  async getMissingCards(): Promise<{ totalActive: number; missing: number }> {
    const { data } = await axiosInstance.get('/card-scan/missing-cards')
    return data
  },

  async generateMissingCards(): Promise<{ created: number; totalActive: number; alreadyHadCard: number }> {
    const { data } = await axiosInstance.post('/card-scan/generate-missing-cards')
    return data
  },
}
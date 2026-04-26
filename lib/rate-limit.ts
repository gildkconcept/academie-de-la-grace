// lib/rate-limit.ts
// Système simple de limitation de tentatives (en mémoire)

interface RateLimitEntry {
  attempts: number
  blockedUntil: number | null
  lastAttempt: number
}

const store = new Map<string, RateLimitEntry>()

const MAX_ATTEMPTS = 5
const BLOCK_DURATION = 15 * 60 * 1000 // 15 minutes en ms

export function checkRateLimit(key: string): {
  allowed: boolean
  remaining: number
  blockedUntil?: number
  message?: string
} {
  const now = Date.now()
  
  // Nettoyer les entrées expirées
  if (store.has(key)) {
    const entry = store.get(key)!
    
    // Si le blocage est terminé, réinitialiser
    if (entry.blockedUntil && now > entry.blockedUntil) {
      store.delete(key)
    }
  }

  let entry = store.get(key)

  if (!entry) {
    entry = { attempts: 0, blockedUntil: null, lastAttempt: now }
    store.set(key, entry)
  }

  // Vérifier si bloqué
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const remainingBlock = Math.ceil((entry.blockedUntil - now) / 1000 / 60)
    return {
      allowed: false,
      remaining: 0,
      blockedUntil: entry.blockedUntil,
      message: `Trop de tentatives. Réessayez dans ${remainingBlock} minute(s).`
    }
  }

  // Vérifier si max tentatives dépassé
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION
    store.set(key, entry)
    return {
      allowed: false,
      remaining: 0,
      blockedUntil: entry.blockedUntil,
      message: `Trop de tentatives. Compte bloqué pendant 15 minutes.`
    }
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - entry.attempts
  }
}

export function recordAttempt(key: string): void {
  const now = Date.now()
  let entry = store.get(key)
  
  if (!entry) {
    entry = { attempts: 0, blockedUntil: null, lastAttempt: now }
  }
  
  entry.attempts++
  entry.lastAttempt = now
  store.set(key, entry)
}

export function resetAttempts(key: string): void {
  store.delete(key)
}
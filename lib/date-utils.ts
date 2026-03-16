/**
 * Retourne la date actuelle en UTC de manière fiable
 * Indépendant du fuseau horaire de l'ordinateur
 */
export function getCurrentUTC(): Date {
  const now = new Date()
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds()
    )
  )
}

/**
 * Vérifie si une date d'expiration est dépassée
 * @param expiresAt - Date d'expiration stockée en UTC
 * @returns true si expiré, false sinon
 */
export function isExpired(expiresAt: string | Date): boolean {
  const now = getCurrentUTC()
  const expiration = new Date(expiresAt)
  return now.getTime() > expiration.getTime()
}

/**
 * Ajoute des minutes à une date en UTC
 * @param date - Date de base
 * @param minutes - Minutes à ajouter
 * @returns Nouvelle date en UTC
 */
export function addMinutesToUTC(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}
// lib/cardToken.ts
// Le QR d'une carte contient un lien du type  https://votre-site/verify/<jeton>.
// Cette fonction en extrait le jeton (elle accepte aussi le jeton seul, collé à la main).

const TOKEN_ONLY = /^[A-Za-z0-9_-]{20,64}$/
const TOKEN_IN_URL = /\/verify\/([A-Za-z0-9_-]{20,64})(?:[/?#]|$)/

export function extractCardToken(raw: string): string | null {
  const text = (raw || '').trim()
  if (!text) return null
  if (TOKEN_ONLY.test(text)) return text
  const match = text.match(TOKEN_IN_URL)
  return match ? match[1] : null
}
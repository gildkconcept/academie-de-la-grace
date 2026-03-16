// lib/debug.ts
export function logDateInfo(etape: string, data?: any) {
  const now = new Date()
  console.log('\n=================================')
  console.log(`🔍 ${etape}`)
  console.log('=================================')
  console.log('📅 DATE ACTUELLE:')
  console.log('Locale:', now.toLocaleString())
  console.log('UTC:', now.toUTCString())
  console.log('ISO:', now.toISOString())
  console.log('Timestamp (ms):', now.getTime())
  console.log('Timestamp (s):', Math.floor(now.getTime() / 1000))
  
  if (data) {
    console.log('\n📦 DONNÉES REÇUES:')
    console.log(JSON.stringify(data, null, 2))
  }
  
  // Heure de Côte d'Ivoire (UTC+0)
  const coteIvoire = new Date(now.getTime())
  console.log('\n🇨🇮 Heure Côte d\'Ivoire (UTC+0):', coteIvoire.toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' }))
  
  // Heure de Paris (UTC+1)
  const paris = new Date(now.getTime())
  console.log('🇫🇷 Heure Paris:', paris.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }))
  
  console.log('=================================\n')
}
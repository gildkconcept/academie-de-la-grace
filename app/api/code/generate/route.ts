import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    // Seul le superadmin peut générer des codes
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ 
        error: 'Accès refusé. Seul l\'administrateur peut générer des codes.' 
      }, { status: 403 })
    }

    // Récupérer la position et le rayon
    const { lat, lng, radius = 200 } = await request.json()

    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: 'Position GPS requise pour générer un code' },
        { status: 400 }
      )
    }

    // Validation simple des coordonnées
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json(
        { error: 'Coordonnées invalides' },
        { status: 400 }
      )
    }

    // Générer un code aléatoire à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Calculer l'expiration (5 minutes)
    const maintenant = new Date()
    const nowUTC = Date.UTC(
      maintenant.getUTCFullYear(),
      maintenant.getUTCMonth(),
      maintenant.getUTCDate(),
      maintenant.getUTCHours(),
      maintenant.getUTCMinutes(),
      maintenant.getUTCSeconds(),
      maintenant.getUTCMilliseconds()
    )
    
    const expiresAtUTC = new Date(nowUTC + 5 * 60 * 1000) // +5 minutes
    const today = new Date(nowUTC).toISOString().split('T')[0]

    console.log('🔧 GÉNÉRATION CODE (5 min):')
    console.log('Code généré:', code)
    console.log('Position:', lat, lng)
    console.log('Rayon:', radius)
    console.log('Expire à (UTC):', expiresAtUTC.toISOString())

    // Vérifier si le code n'existe pas déjà
    const { data: existingCode } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', code)
      .maybeSingle()

    if (existingCode) {
      console.log('⚠️ Code déjà existant, regénération...')
      return POST(request)
    }

    // Créer une session avec les coordonnées
    const { data: session, error } = await supabase
      .from('sessions')
      .insert([{
        code: code,
        expires_at: expiresAtUTC.toISOString(),
        date: today,
        lat: lat,
        lng: lng,
        radius: radius
        // Pas de service_id = code pour tous les services
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ Erreur création session:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la création de la session' },
        { status: 500 }
      )
    }

    console.log('✅ Session créée avec succès!')
    console.log('Session ID:', session.id)
    console.log('Code stocké:', session.code)

    return NextResponse.json({
      code: code,
      sessionId: session.id,
      expiresAt: session.expires_at,
      isUniversal: true,
      center: { lat, lng, radius }
    })
  } catch (error) {
    console.error('❌ Erreur globale:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const startTime = Date.now()
  console.log('🚀 [GENERATE] ========== DÉBUT GÉNÉRATION CODE ==========')
  
  try {
    // ✅ Lire le token depuis le cookie
    console.log('🔍 [GENERATE] Étape 1: Lecture du cookie...')
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    console.log('🔍 [GENERATE] Token présent:', !!token)
    
    if (!token) {
      console.log('❌ [GENERATE] Token manquant')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    console.log('🔍 [GENERATE] Étape 2: Vérification du token...')
    const user = verifyToken(token)
    console.log('🔍 [GENERATE] Utilisateur:', { 
      id: user?.id, 
      role: user?.role,
      name: user?.name 
    })
    
    // Seul le superadmin peut générer des codes
    if (!user || user.role !== 'superadmin') {
      console.log('❌ [GENERATE] Accès refusé - rôle:', user?.role)
      return NextResponse.json({ 
        error: 'Accès refusé. Seul l\'administrateur peut générer des codes.' 
      }, { status: 403 })
    }

    // ✅ Récupérer la position, le rayon ET le niveau (optionnel)
    console.log('🔍 [GENERATE] Étape 3: Lecture du body...')
    const body = await request.json()
    console.log('📦 [GENERATE] Body reçu:', JSON.stringify(body, null, 2))
    
    const { lat, lng, radius = 200, level = null } = body

    // ✅ Validation du niveau (si fourni)
    console.log('🔍 [GENERATE] Étape 4: Validation du niveau...')
    let targetLevel = null
    if (level !== null && level !== 'all') {
      targetLevel = parseInt(level)
      console.log('📊 [GENERATE] Niveau spécifié:', targetLevel)
      if (isNaN(targetLevel) || targetLevel < 1 || targetLevel > 3) {
        console.log('❌ [GENERATE] Niveau invalide:', level)
        return NextResponse.json(
          { error: 'Le niveau doit être 1, 2 ou 3' },
          { status: 400 }
        )
      }
    } else {
      console.log('📊 [GENERATE] Niveau: UNIVERSEL (tous niveaux)')
    }

    // Validation des coordonnées si elles sont fournies
    if (lat !== undefined && (Math.abs(lat) > 90 || Math.abs(lng) > 180)) {
      console.log('❌ [GENERATE] Coordonnées invalides:', { lat, lng })
      return NextResponse.json(
        { error: 'Coordonnées invalides' },
        { status: 400 }
      )
    }

    // Générer un code aléatoire à 6 chiffres
    console.log('🔍 [GENERATE] Étape 5: Génération du code...')
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    console.log('🔢 [GENERATE] Code généré:', code)
    
    // Calculer l'expiration (15 minutes)
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
    
    const expiresAtUTC = new Date(nowUTC + 15 * 60 * 1000)
    const today = new Date(nowUTC).toISOString().split('T')[0]

    console.log('⏰ [GENERATE] Horodatage:')
    console.log('   - Heure actuelle UTC:', new Date(nowUTC).toISOString())
    console.log('   - Expiration UTC:', expiresAtUTC.toISOString())
    console.log('   - Date de session:', today)
    if (lat !== undefined) {
      console.log('📍 [GENERATE] Géolocalisation:')
      console.log('   - Latitude:', lat)
      console.log('   - Longitude:', lng)
      console.log('   - Rayon:', radius, 'mètres')
    }

    // Vérifier si le code n'existe pas déjà
    console.log('🔍 [GENERATE] Étape 6: Vérification code unique...')
    const { data: existingCode, error: checkError } = await supabase
      .from('sessions')
      .select('id')
      .eq('code', code)
      .maybeSingle()

    if (checkError) {
      console.log('⚠️ [GENERATE] Erreur vérification code:', checkError)
    }

    if (existingCode) {
      console.log('⚠️ [GENERATE] Code déjà existant, regénération...')
      return POST(request)
    }
    console.log('✅ [GENERATE] Code unique vérifié')

    // ✅ Créer une session avec le niveau
    console.log('🔍 [GENERATE] Étape 7: Insertion en base de données...')
    const sessionData: any = {
      code: code,
      expires_at: expiresAtUTC.toISOString(),
      date: today,
      level: targetLevel  // ← NULL = universel, 1,2,3 = spécifique
    }

    // Ajouter les coordonnées seulement si fournies
    if (lat !== undefined && lng !== undefined) {
      sessionData.lat = lat
      sessionData.lng = lng
      sessionData.radius = radius
      console.log('📍 [GENERATE] Coordonnées ajoutées à la session')
    }

    console.log('📝 [GENERATE] Données à insérer:', JSON.stringify(sessionData, null, 2))

    const { data: session, error } = await supabase
      .from('sessions')
      .insert([sessionData])
      .select()
      .single()

    if (error) {
      console.error('❌ [GENERATE] Erreur création session:', error)
      console.error('❌ [GENERATE] Détails erreur:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { error: 'Erreur lors de la création de la session', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ [GENERATE] Session créée avec succès!')
    console.log('   - Session ID:', session.id)
    console.log('   - Code stocké:', session.code)
    console.log('   - Niveau stocké:', session.level === null ? 'UNIVERSEL' : session.level)
    console.log('   - Expiration:', session.expires_at)

    // ✅ Déterminer le mode pour le frontend
    const mode = targetLevel === null ? 'universal' : 'by_level'
    const duration = Date.now() - startTime
    console.log(`⏱️ [GENERATE] Durée totale: ${duration}ms`)
    console.log('🎉 [GENERATE] ========== FIN GÉNÉRATION RÉUSSIE ==========\n')

    return NextResponse.json({
      success: true,
      code: code,
      sessionId: session.id,
      expiresAt: session.expires_at,
      level: targetLevel,
      mode: mode,
      isUniversal: targetLevel === null,
      center: lat !== undefined ? { lat, lng, radius } : null
    })
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ [GENERATE] ========== ERREUR ==========')
    console.error('❌ [GENERATE] Message:', error instanceof Error ? error.message : 'Erreur inconnue')
    console.error('❌ [GENERATE] Stack:', error instanceof Error ? error.stack : 'Pas de stack')
    console.error('❌ [GENERATE] Durée avant erreur:', duration, 'ms')
    console.error('❌ [GENERATE] ========== FIN ERREUR ==========\n')
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
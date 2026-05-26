import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const startTime = Date.now()
  console.log('🔐 [VERIFY] ========== DÉBUT VÉRIFICATION CODE ==========')
  
  try {
    // ✅ Lire le token depuis le cookie
    console.log('🔍 [VERIFY] Étape 1: Lecture du cookie...')
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    console.log('🔍 [VERIFY] Token présent:', !!token)
    
    if (!token) {
      console.log('❌ [VERIFY] Token manquant')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    console.log('🔍 [VERIFY] Étape 2: Vérification du token...')
    const user = verifyToken(token)
    console.log('🔍 [VERIFY] Utilisateur:', { 
      id: user?.id, 
      role: user?.role,
      name: user?.name 
    })
    
    if (!user || user.role !== 'student') {
      console.log('❌ [VERIFY] Accès refusé - rôle:', user?.role)
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    console.log('🔍 [VERIFY] Étape 3: Récupération du code...')
    const { code } = await request.json()
    console.log('🔢 [VERIFY] Code reçu:', code)

    if (!code || code.length !== 6) {
      console.log('❌ [VERIFY] Code invalide - longueur:', code?.length)
      return NextResponse.json({ error: 'Code invalide' }, { status: 400 })
    }

    console.log('🔍 [VERIFY] Étape 4: Recherche de la session...')
    // Vérifier si la session existe avec ce code
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', code)
      .maybeSingle()

    if (sessionError) {
      console.error('❌ [VERIFY] Erreur recherche session:', sessionError)
      return NextResponse.json({ error: 'Erreur lors de la recherche' }, { status: 500 })
    }

    if (!session) {
      console.log('❌ [VERIFY] Code non trouvé dans la base')
      return NextResponse.json({ error: 'Code invalide' }, { status: 400 })
    }

    console.log('✅ [VERIFY] Code trouvé!')
    console.log('   - Session ID:', session.id)
    console.log('   - Niveau session:', session.level === null ? 'UNIVERSEL' : `Niveau ${session.level}`)
    console.log('   - Expiration:', session.expires_at)

    // ✅ Étape 5: Récupérer le niveau de l'étudiant
    console.log('🔍 [VERIFY] Étape 5: Récupération du niveau étudiant...')
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, level, full_name')
      .eq('id', user.id)
      .single()

    if (studentError) {
      console.error('❌ [VERIFY] Erreur récupération étudiant:', studentError)
      return NextResponse.json({ error: 'Étudiant non trouvé' }, { status: 404 })
    }

    console.log('📚 [VERIFY] Étudiant:', {
      id: student.id,
      name: student.full_name,
      level: student.level
    })

    // ✅ Étape 6: Vérifier le niveau
    console.log('🔍 [VERIFY] Étape 6: Vérification du niveau...')
    
    // Si la session a un niveau spécifique (non NULL)
    if (session.level !== null && student.level !== session.level) {
      console.log('❌ [VERIFY] Niveau incorrect!')
      console.log('   - Niveau étudiant:', student.level)
      console.log('   - Niveau requis:', session.level)
      return NextResponse.json({ 
        error: `Ce code est pour le niveau ${session.level}. Votre niveau est ${student.level}.`,
        requiredLevel: session.level,
        yourLevel: student.level
      }, { status: 403 })
    }
    
    if (session.level === null) {
      console.log('✅ [VERIFY] Session universelle - accès autorisé pour tous les niveaux')
    } else {
      console.log('✅ [VERIFY] Niveau vérifié - accès autorisé')
    }

    // Vérifier l'expiration
    console.log('🔍 [VERIFY] Étape 7: Vérification expiration...')
    const maintenant = new Date()
    const expiresAt = new Date(session.expires_at)
    const timeLeftMs = expiresAt.getTime() - maintenant.getTime()
    const timeLeftMinutes = Math.floor(timeLeftMs / 60000)
    const timeLeftSeconds = Math.floor((timeLeftMs % 60000) / 1000)

    console.log('⏰ [VERIFY] Temps restant:', `${timeLeftMinutes}m ${timeLeftSeconds}s`)

    if (maintenant.getTime() > expiresAt.getTime()) {
      console.log('❌ [VERIFY] Code expiré')
      console.log('   - Expiration:', expiresAt.toISOString())
      console.log('   - Maintenant:', maintenant.toISOString())
      return NextResponse.json({ error: 'Code expiré' }, { status: 400 })
    }

    console.log('✅ [VERIFY] Code valide (non expiré)')

    // Vérifier si déjà enregistré
    console.log('🔍 [VERIFY] Étape 8: Vérification présence existante...')
    const { data: existingAttendance, error: existingError } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', user.id)
      .eq('session_id', session.id)
      .maybeSingle()

    if (existingError) {
      console.error('❌ [VERIFY] Erreur vérification présence:', existingError)
    }

    if (existingAttendance) {
      console.log('❌ [VERIFY] Présence déjà enregistrée pour cette session')
      return NextResponse.json({ error: 'Présence déjà enregistrée' }, { status: 400 })
    }

    console.log('✅ [VERIFY] Aucune présence existante')

    // Enregistrer la présence
    console.log('🔍 [VERIFY] Étape 9: Enregistrement de la présence...')
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()
    
    const attendanceData = {
      student_id: user.id,
      session_id: session.id,
      status: 'present',
      date: today,
      scanned_at: now,
      method: 'code'
    }
    
    console.log('📝 [VERIFY] Données présence:', JSON.stringify(attendanceData, null, 2))

    const { error: attendanceError } = await supabase
      .from('attendance')
      .insert([attendanceData])

    if (attendanceError) {
      console.error('❌ [VERIFY] Erreur enregistrement:', attendanceError)
      console.error('❌ [VERIFY] Détails:', {
        message: attendanceError.message,
        code: attendanceError.code,
        details: attendanceError.details
      })
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 })
    }

    const duration = Date.now() - startTime
    console.log('✅ [VERIFY] Présence enregistrée avec succès!')
    console.log('   - Méthode: code')
    console.log('   - Date:', today)
    console.log('   - Heure scan:', now)
    console.log(`⏱️ [VERIFY] Durée totale: ${duration}ms`)
    console.log('🎉 [VERIFY] ========== FIN VÉRIFICATION RÉUSSIE ==========\n')

    return NextResponse.json({ 
      success: true, 
      message: 'Présence enregistrée avec succès',
      sessionLevel: session.level,
      studentLevel: student.level
    })
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ [VERIFY] ========== ERREUR ==========')
    console.error('❌ [VERIFY] Message:', error instanceof Error ? error.message : 'Erreur inconnue')
    console.error('❌ [VERIFY] Stack:', error instanceof Error ? error.stack : 'Pas de stack')
    console.error('❌ [VERIFY] Durée avant erreur:', duration, 'ms')
    console.error('❌ [VERIFY] ========== FIN ERREUR ==========\n')
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
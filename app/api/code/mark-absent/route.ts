import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const startTime = Date.now()
  console.log('📝 [MARK-ABSENT] ========== DÉBUT MARQUAGE ABSENTS ==========')
  
  try {
    const { sessionId } = await request.json()
    console.log('🔍 [MARK-ABSENT] Session ID:', sessionId)

    if (!sessionId) {
      console.log('❌ [MARK-ABSENT] Session ID manquant')
      return NextResponse.json(
        { error: 'Session ID requis' },
        { status: 400 }
      )
    }

    // Récupérer la session
    console.log('🔍 [MARK-ABSENT] Étape 1: Récupération de la session...')
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('❌ [MARK-ABSENT] Session non trouvée:', sessionError)
      return NextResponse.json(
        { error: 'Session non trouvée' },
        { status: 404 }
      )
    }

    console.log('✅ [MARK-ABSENT] Session trouvée:')
    console.log('   - ID:', session.id)
    console.log('   - Code:', session.code)
    console.log('   - Niveau:', session.level === null ? 'UNIVERSEL' : `Niveau ${session.level}`)
    console.log('   - Expiration:', session.expires_at)
    console.log('   - Service ID:', session.service_id || 'Aucun')

    // Vérifier si la session est expirée
    console.log('🔍 [MARK-ABSENT] Étape 2: Vérification expiration...')
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
    
    const expiresAt = new Date(session.expires_at)
    const expiresAtUTC = expiresAt.getTime()

    if (nowUTC <= expiresAtUTC) {
      const resteSecondes = Math.floor((expiresAtUTC - nowUTC) / 1000)
      const resteMinutes = Math.floor(resteSecondes / 60)
      console.log('⏰ [MARK-ABSENT] Session non expirée, temps restant:', `${resteMinutes}m ${resteSecondes % 60}s`)
      return NextResponse.json({
        message: 'La session n\'est pas encore expirée',
        expiresIn: resteSecondes,
        status: 'waiting'
      })
    }

    console.log('⏰ [MARK-ABSENT] Session expirée, marquage des absents...')

    // ✅ Étape 3: Récupérer les étudiants (filtrés par niveau si nécessaire)
    console.log('🔍 [MARK-ABSENT] Étape 3: Récupération des étudiants concernés...')
    let studentsQuery = supabase.from('students').select('id, level, full_name')
    
    // ✅ Filtrer par niveau si la session a un niveau spécifique
    if (session.level !== null) {
      console.log(`📚 [MARK-ABSENT] Filtrage par niveau: ${session.level}`)
      studentsQuery = studentsQuery.eq('level', session.level)
    } else {
      console.log('🌍 [MARK-ABSENT] Session universelle - tous les niveaux')
    }
    
    // Filtrer par service si spécifié
    if (session.service_id) {
      console.log(`🏢 [MARK-ABSENT] Filtrage par service: ${session.service_id}`)
      studentsQuery = studentsQuery.eq('service_id', session.service_id)
    }
    
    const { data: allStudents, error: studentsError } = await studentsQuery

    if (studentsError) {
      console.error('❌ [MARK-ABSENT] Erreur récupération étudiants:', studentsError)
      return NextResponse.json(
        { error: 'Erreur récupération étudiants' },
        { status: 500 }
      )
    }

    if (!allStudents || allStudents.length === 0) {
      console.log('⚠️ [MARK-ABSENT] Aucun étudiant trouvé pour cette session')
      console.log('   - Niveau requis:', session.level === null ? 'TOUS' : session.level)
      console.log('   - Service requis:', session.service_id || 'TOUS')
      return NextResponse.json({
        message: 'Aucun étudiant concerné par cette session',
        total: 0,
        presents: 0,
        absents: 0,
        status: 'completed'
      })
    }

    console.log(`📊 [MARK-ABSENT] Étudiants concernés: ${allStudents.length}`)
    if (allStudents.length <= 10) {
      console.log('   - Liste:', allStudents.map(s => `${s.full_name} (Niv.${s.level})`).join(', '))
    }

    // Récupérer les présences déjà enregistrées pour cette session
    console.log('🔍 [MARK-ABSENT] Étape 4: Récupération des présences existantes...')
    const { data: existingAttendances, error: attendanceError } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('session_id', sessionId)

    if (attendanceError) {
      console.error('❌ [MARK-ABSENT] Erreur récupération présences:', attendanceError)
      return NextResponse.json(
        { error: 'Erreur récupération présences' },
        { status: 500 }
      )
    }

    console.log(`📊 [MARK-ABSENT] Présences existantes: ${existingAttendances?.length || 0}`)

    // Identifier les étudiants absents
    const presentIds = new Set(
      existingAttendances
        ?.filter(a => a.status === 'present')
        .map(a => a.student_id) || []
    )
    
    const absentStudents = allStudents?.filter(s => !presentIds.has(s.id)) || []

    console.log(`📊 [MARK-ABSENT] Présents: ${presentIds.size}, Absents: ${absentStudents.length}`)

    if (absentStudents.length === 0) {
      console.log('✅ [MARK-ABSENT] Tous les étudiants ont marqué leur présence')
      return NextResponse.json({
        message: 'Tous les étudiants ont marqué leur présence',
        total: allStudents.length,
        presents: presentIds.size,
        absents: 0,
        status: 'completed'
      })
    }

    // Vérifier quels absents n'ont pas déjà été marqués
    const alreadyMarkedIds = new Set(
      existingAttendances
        ?.filter(a => a.status === 'absent')
        .map(a => a.student_id) || []
    )

    const newAbsentStudents = absentStudents.filter(s => !alreadyMarkedIds.has(s.id))

    console.log(`📊 [MARK-ABSENT] Nouveaux absents à marquer: ${newAbsentStudents.length}`)

    if (newAbsentStudents.length === 0) {
      console.log('✅ [MARK-ABSENT] Les absents ont déjà été marqués')
      return NextResponse.json({
        message: 'Les absents ont déjà été marqués',
        total: allStudents.length,
        presents: presentIds.size,
        absents: absentStudents.length,
        status: 'completed'
      })
    }

    // Marquer les nouveaux absents
    console.log('🔍 [MARK-ABSENT] Étape 5: Insertion des absents...')
    const absentRecords = newAbsentStudents.map(student => ({
      student_id: student.id,
      session_id: sessionId,
      status: 'absent',
      date: session.date,
      scanned_at: new Date().toISOString(),
      method: 'auto_mark'  // ← Ajouté pour tracer que c'est automatique
    }))

    const { error: insertError } = await supabase
      .from('attendance')
      .insert(absentRecords)

    if (insertError) {
      console.error('❌ [MARK-ABSENT] Erreur marquage des absents:', insertError)
      console.error('❌ [MARK-ABSENT] Détails:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details
      })
      return NextResponse.json(
        { error: 'Erreur lors du marquage des absents' },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime
    console.log('✅ [MARK-ABSENT] Absents marqués avec succès!')
    console.log('   - Nouveaux absents:', newAbsentStudents.length)
    console.log('   - Total présents:', presentIds.size)
    console.log('   - Total absents:', absentStudents.length)
    console.log('   - Niveau session:', session.level === null ? 'UNIVERSEL' : session.level)
    console.log(`⏱️ [MARK-ABSENT] Durée totale: ${duration}ms`)
    console.log('🎉 [MARK-ABSENT] ========== FIN MARQUAGE RÉUSSI ==========\n')

    return NextResponse.json({
      success: true,
      message: `${newAbsentStudents.length} étudiants marqués comme absents`,
      total: allStudents.length,
      presents: presentIds.size,
      absents: absentStudents.length,
      newAbsents: newAbsentStudents.length,
      sessionLevel: session.level,
      status: 'completed'
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('❌ [MARK-ABSENT] ========== ERREUR ==========')
    console.error('❌ [MARK-ABSENT] Message:', error instanceof Error ? error.message : 'Erreur inconnue')
    console.error('❌ [MARK-ABSENT] Stack:', error instanceof Error ? error.stack : 'Pas de stack')
    console.error('❌ [MARK-ABSENT] Durée avant erreur:', duration, 'ms')
    console.error('❌ [MARK-ABSENT] ========== FIN ERREUR ==========\n')
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
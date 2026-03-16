import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID requis' },
        { status: 400 }
      )
    }

    console.log('🔍 MARQUAGE DES ABSENTS pour la session:', sessionId)

    // Récupérer la session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier si la session est expirée
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
      return NextResponse.json({
        message: 'La session n\'est pas encore expirée',
        expiresIn: resteSecondes,
        status: 'waiting'
      })
    }

    console.log('⏰ Session expirée, marquage des absents...')

    // Récupérer tous les étudiants
    let studentsQuery = supabase.from('students').select('id')
    
    if (session.service_id) {
      studentsQuery = studentsQuery.eq('service_id', session.service_id)
    }
    
    const { data: allStudents, error: studentsError } = await studentsQuery

    if (studentsError) {
      console.error('Erreur récupération étudiants:', studentsError)
      return NextResponse.json(
        { error: 'Erreur récupération étudiants' },
        { status: 500 }
      )
    }

    // Récupérer les présences déjà enregistrées pour cette session
    const { data: existingAttendances, error: attendanceError } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('session_id', sessionId)

    if (attendanceError) {
      console.error('Erreur récupération présences:', attendanceError)
      return NextResponse.json(
        { error: 'Erreur récupération présences' },
        { status: 500 }
      )
    }

    // Identifier les étudiants absents (pas de présence ou pas de statut present)
    const presentIds = new Set(
      existingAttendances
        ?.filter(a => a.status === 'present')
        .map(a => a.student_id) || []
    )
    
    const absentStudents = allStudents?.filter(s => !presentIds.has(s.id)) || []

    if (absentStudents.length === 0) {
      console.log('✅ Tous les étudiants ont marqué leur présence')
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

    if (newAbsentStudents.length === 0) {
      console.log('✅ Les absents ont déjà été marqués')
      return NextResponse.json({
        message: 'Les absents ont déjà été marqués',
        total: allStudents.length,
        presents: presentIds.size,
        absents: absentStudents.length,
        status: 'completed'
      })
    }

    // Marquer les nouveaux absents
    const absentRecords = newAbsentStudents.map(student => ({
      student_id: student.id,
      session_id: sessionId,
      status: 'absent',
      date: session.date,
      scanned_at: new Date().toISOString()
    }))

    const { error: insertError } = await supabase
      .from('attendance')
      .insert(absentRecords)

    if (insertError) {
      console.error('Erreur marquage des absents:', insertError)
      return NextResponse.json(
        { error: 'Erreur lors du marquage des absents' },
        { status: 500 }
      )
    }

    console.log('✅ Absents marqués avec succès:', newAbsentStudents.length)
    console.log('   Total présents:', presentIds.size)
    console.log('   Total absents:', absentStudents.length)

    return NextResponse.json({
      success: true,
      message: `${newAbsentStudents.length} étudiants marqués comme absents`,
      total: allStudents.length,
      presents: presentIds.size,
      absents: absentStudents.length,
      newAbsents: newAbsentStudents.length,
      status: 'completed'
    })

  } catch (error) {
    console.error('❌ Erreur globale:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
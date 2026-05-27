import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET - Récupérer les étudiants sans téléphone (filtrés par niveau)
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('serviceId')
    const sessionId = searchParams.get('sessionId')

    // ✅ Récupérer la session et son niveau
    let sessionLevel = null
    if (sessionId) {
      const { data: session } = await supabase
        .from('sessions')
        .select('level')
        .eq('id', sessionId)
        .single()
      
      if (session) {
        sessionLevel = session.level
      }
    }

    // Récupérer les étudiants sans téléphone
    let query = supabase
      .from('students')
      .select('*')
      .eq('has_phone', false)
      .is('deleted_at', null)
      .order('full_name')

    // ✅ Filtrer par service si demandé
    if (serviceId && serviceId !== 'all') {
      query = query.eq('service_id', serviceId)
    }

    // ✅ Filtrer par niveau si la session a un niveau spécifique
    if (sessionLevel !== null) {
      query = query.eq('level', sessionLevel)
    }

    const { data: students, error } = await query

    if (error) throw error

    // Si une session est spécifiée, récupérer les présences existantes
    let attendances: any[] = []
    if (sessionId) {
      const { data: existingAttendances } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('session_id', sessionId)

      if (existingAttendances) {
        attendances = existingAttendances
      }
    }

    // Fusionner les données
    const studentsWithStatus = students.map(student => ({
      ...student,
      status: attendances.find(a => a.student_id === student.id)?.status || 'absent'
    }))

    return NextResponse.json({ students: studentsWithStatus })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Marquer les présences assistées (avec vérification niveau)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { sessionId, attendances } = await request.json()

    if (!sessionId || !attendances) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    // ✅ Vérifier que la session existe et récupérer son niveau
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, date, level')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 })
    }

    // ✅ Récupérer les IDs des étudiants autorisés (selon niveau de la session)
    let studentsQuery = supabase
      .from('students')
      .select('id')
      .eq('has_phone', false)
      .is('deleted_at', null)

    // ✅ Si la session a un niveau spécifique, filtrer par ce niveau
    if (session.level !== null) {
      studentsQuery = studentsQuery.eq('level', session.level)
    }

    const { data: authorizedStudents } = await studentsQuery
    const authorizedIds = new Set(authorizedStudents?.map(s => s.id) || [])

    // ✅ Filtrer les présences pour ne garder que les étudiants autorisés
    const validAttendances = attendances.filter((a: any) => authorizedIds.has(a.studentId))

    if (validAttendances.length === 0) {
      return NextResponse.json({ 
        error: 'Aucun étudiant autorisé pour cette session (vérifiez le niveau)' 
      }, { status: 400 })
    }

    // Si des étudiants non autorisés ont été exclus, afficher un avertissement
    const excludedCount = attendances.length - validAttendances.length
    if (excludedCount > 0) {
      console.log(`⚠️ ${excludedCount} étudiant(s) exclus car niveau incorrect pour cette session`)
    }

    // Préparer les enregistrements
    const records = validAttendances.map((att: any) => ({
      student_id: att.studentId,
      session_id: sessionId,
      status: att.status,
      date: session.date,
      scanned_at: new Date().toISOString(),
      method: 'assisted',
      marked_by: user.id
    }))

    // Upsert des présences
    const { error: upsertError } = await supabase
      .from('attendance')
      .upsert(records, { onConflict: 'student_id,session_id' })

    if (upsertError) {
      console.error('Erreur upsert:', upsertError)
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 })
    }

    const message = excludedCount > 0 
      ? `${validAttendances.length} présence(s) enregistrée(s) (${excludedCount} étudiant(s) exclus niveau incorrect)`
      : `${validAttendances.length} présence(s) enregistrée(s)`

    return NextResponse.json({
      success: true,
      message,
      validCount: validAttendances.length,
      excludedCount
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
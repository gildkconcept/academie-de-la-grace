import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET - Récupérer les étudiants sans téléphone
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

    // Récupérer les étudiants sans téléphone
    let query = supabase
      .from('students')
      .select('*')
      .eq('has_phone', false)
      .is('deleted_at', null)
      .order('full_name')

    if (serviceId && serviceId !== 'all') {
      query = query.eq('service_id', serviceId)
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

// POST - Marquer les présences assistées
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

    // Vérifier que la session existe
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, date')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 })
    }

    // Préparer les enregistrements
    const records = attendances.map((att: any) => ({
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

    return NextResponse.json({
      success: true,
      message: `${records.length} présence(s) enregistrée(s)`
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
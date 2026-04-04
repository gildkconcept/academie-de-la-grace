import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user || user.role !== 'service_manager') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID requis' }, { status: 400 })
    }

    // Récupérer la session
    const { data: session, error: sessionError } = await supabase
      .from('service_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 })
    }

    // Vérifier l'accès
    if (session.service_id !== user.serviceId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer les présences
    const { data: attendances } = await supabase
      .from('service_attendance')
      .select('student_id, status')
      .eq('service_session_id', session.id)

    // Récupérer les étudiants
    const { data: students } = await supabase
      .from('students')
      .select('id, full_name')
      .eq('service_id', user.serviceId)

    const studentList = (students || []).map(student => ({
      id: student.id,
      name: student.full_name,
      status: attendances?.find(a => a.student_id === student.id)?.status || 'absent'
    }))

    return NextResponse.json({
      session: session,
      students: studentList
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

interface ServiceSession {
  id: string
  service_id: string
  date: string
  created_at: string
  created_by: string
  service_attendance?: Array<{
    student_id: string
    status: string
  }>
}

interface ServiceAttendance {
  student_id: string
  status: string
}

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

    // Si un sessionId est fourni, récupérer cette session spécifique
    if (sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('service_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Session non trouvée' },
          { status: 404 }
        )
      }

      // Récupérer les présences
      const { data: attendances } = await supabase
        .from('service_attendance')
        .select('student_id, status')
        .eq('service_session_id', session.id)

      // Récupérer tous les étudiants du service
      const { data: students } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('service_id', user.serviceId)

      const studentList = (students || []).map((student: { id: string; full_name: string }) => ({
        id: student.id,
        name: student.full_name,
        status: attendances?.find((a: ServiceAttendance) => a.student_id === student.id)?.status || 'absent'
      }))

      return NextResponse.json({
        session: session,
        students: studentList
      })
    }

    // Sinon, récupérer toutes les sessions du service
    const { data: sessions, error } = await supabase
      .from('service_sessions')
      .select(`
        *,
        service_attendance (
          student_id,
          status
        )
      `)
      .eq('service_id', user.serviceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur récupération sessions:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération' },
        { status: 500 }
      )
    }

    // Pour chaque session, ajouter les statistiques
    const sessionsWithStats = (sessions || []).map((session: ServiceSession) => {
      const attendances = session.service_attendance || []
      const present = attendances.filter((a: ServiceAttendance) => a.status === 'present').length
      const total = attendances.length
      return {
        ...session,
        stats: {
          present,
          absent: total - present,
          total
        }
      }
    })

    return NextResponse.json({
      sessions: sessionsWithStats,
      currentSession: sessionsWithStats[0] || null
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
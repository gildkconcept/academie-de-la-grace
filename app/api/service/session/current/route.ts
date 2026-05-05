import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    // ✅ Lire le token depuis le cookie
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    
    if (!user || (user.role !== 'service_manager' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Récupérer la session la PLUS RÉCENTE du jour
    let query = supabase
      .from('service_sessions')
      .select('*')
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(1)

    if (user.role === 'service_manager') {
      query = query.eq('service_id', user.serviceId)
    }

    const { data: sessions, error: sessionError } = await query

    if (sessionError) {
      console.error('Erreur session:', sessionError)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    const session = sessions && sessions.length > 0 ? sessions[0] : null

    let studentsList: any[] = []

    if (session) {
      const serviceId = session.service_id || user.serviceId

      const { data: attendances } = await supabase
        .from('service_attendance')
        .select('student_id, status, method')
        .eq('service_session_id', session.id)

      const attendanceMap = new Map(attendances?.map(a => [a.student_id, { status: a.status, method: a.method }]))

      const { data: students } = await supabase
        .from('students')
        .select('id, full_name, phone, has_phone')
        .eq('service_id', serviceId)
        .is('deleted_at', null)

      studentsList = (students || []).map(student => {
        const attendance = attendanceMap.get(student.id)
        return {
          id: student.id,
          name: student.full_name,
          phone: student.phone,
          hasPhone: student.has_phone !== undefined ? student.has_phone : (student.phone ? true : false),
          status: attendance?.status || 'absent',
          method: attendance?.method || null
        }
      })
    }

    return NextResponse.json({
      session: session || null,
      students: studentsList
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
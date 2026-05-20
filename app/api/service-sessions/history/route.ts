import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const user = verifyToken(token)
    if (!user || (user.role !== 'superadmin' && user.role !== 'service_manager')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const serviceId = searchParams.get('serviceId')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('service_sessions')
      .select('*, service:services(name), session_types(code, label)')
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (startDate) query = query.gte('date', startDate)
    if (endDate) query = query.lte('date', endDate)
    if (serviceId && serviceId !== 'all') query = query.eq('service_id', serviceId)
    else if (user.role === 'service_manager') query = query.eq('service_id', user.serviceId)
    if (type && type !== 'all') query = query.eq('type', type)

    const { data: sessions, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const sessionsWithStats = await Promise.all((sessions || []).map(async (session) => {
      const { data: attendances } = await supabase
        .from('service_attendance')
        .select('status')
        .eq('service_session_id', session.id)

      const present = attendances?.filter(a => a.status === 'present').length || 0
      const absent = attendances?.filter(a => a.status === 'absent').length || 0
      const total = attendances?.length || 0

      return {
        ...session,
        stats: { present, absent, total, rate: total > 0 ? Math.round((present / total) * 100) : 0 }
      }
    }))

    // Stats globales
    const { data: allSessions } = await supabase.from('service_sessions').select('id')
    const { data: allAttendances } = await supabase.from('service_attendance').select('status')
    const totalPresent = allAttendances?.filter(a => a.status === 'present').length || 0

    return NextResponse.json({
      sessions: sessionsWithStats,
      stats: {
        totalSessions: allSessions?.length || 0,
        totalAttendance: allAttendances?.length || 0,
        totalPresent,
globalRate: (allAttendances?.length || 0) > 0 ? Math.round((totalPresent / (allAttendances?.length || 1)) * 100) : 0
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
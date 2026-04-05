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
    if (!user || (user.role !== 'service_manager' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const serviceId = searchParams.get('serviceId')

    let query = supabase
      .from('service_sessions')
      .select('*, session_types(code, label, day_of_week)')
      .order('created_at', { ascending: false })

    if (user.role === 'service_manager') {
      query = query.eq('service_id', user.serviceId)
    } else if (serviceId && serviceId !== 'all') {
      query = query.eq('service_id', serviceId)
    }

    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    const { data, error } = await query
    if (error) throw error

    // Ajouter les statistiques
    const sessionsWithStats = await Promise.all((data || []).map(async (session) => {
      const { data: attendances } = await supabase
        .from('service_attendance')
        .select('status')
        .eq('service_session_id', session.id)
      const present = attendances?.filter(a => a.status === 'present').length || 0
      const total = attendances?.length || 0
      return { ...session, stats: { present, absent: total - present, total } }
    }))

    return NextResponse.json({ sessions: sessionsWithStats })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
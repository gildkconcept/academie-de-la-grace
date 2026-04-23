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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('service_sessions')
      .select(`
        *,
        service_attendance (count),
        service:services (name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (user.role === 'service_manager') {
      query = query.eq('service_id', user.serviceId)
    }

    const { data: sessions, error, count } = await query

    if (error) {
      console.error('Erreur récupération historique:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    // Pour chaque session, récupérer les stats de présence
    const sessionsWithStats = await Promise.all((sessions || []).map(async (session) => {
      const { data: attendances } = await supabase
        .from('service_attendance')
        .select('status')
        .eq('service_session_id', session.id)

      const total = attendances?.length || 0
      const present = attendances?.filter(a => a.status === 'present').length || 0
      const absent = total - present

      return {
        ...session,
        stats: {
          total,
          present,
          absent,
          rate: total > 0 ? Math.round((present / total) * 100) : 0
        }
      }
    }))

    return NextResponse.json({
      sessions: sessionsWithStats,
      total: count || 0
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
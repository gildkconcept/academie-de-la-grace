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

    // Récupérer TOUTES les sessions du service
    const { data: sessions, error } = await supabase
      .from('service_sessions')
      .select('*')
      .eq('service_id', user.serviceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    // Pour chaque session, compter les présences
    const sessionsWithStats = await Promise.all((sessions || []).map(async (session) => {
      const { data: attendances } = await supabase
        .from('service_attendance')
        .select('status')
        .eq('service_session_id', session.id)
      
      const present = attendances?.filter(a => a.status === 'present').length || 0
      const total = attendances?.length || 0
      
      return {
        id: session.id,
        service_id: session.service_id,
        date: session.date,
        created_at: session.created_at,
        stats: {
          present,
          absent: total - present,
          total
        }
      }
    }))

    return NextResponse.json({
      sessions: sessionsWithStats
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
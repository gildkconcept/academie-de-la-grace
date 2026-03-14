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
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('serviceId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let query = supabase
      .from('attendance')
      .select(`
        *,
        students (
          full_name,
          service_id,
          level,
          baptized
        ),
        sessions (
          service_id,
          date
        )
      `)

    if (serviceId) {
      query = query.eq('sessions.service_id', serviceId)
    }

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des stats' },
        { status: 500 }
      )
    }

    // Calculer les statistiques
    const stats = {
      total: data.length,
      present: data.filter(a => a.status === 'present').length,
      absent: data.filter(a => a.status === 'absent').length,
      late: data.filter(a => a.status === 'late').length,
      byService: {} as Record<string, number>,
      byLevel: {
        1: data.filter(a => a.students?.level === 1).length,
        2: data.filter(a => a.students?.level === 2).length
      },
      baptized: data.filter(a => a.students?.baptized).length
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
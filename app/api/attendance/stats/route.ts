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
    const sessionId = searchParams.get('sessionId')

    let query = supabase
      .from('attendance')
      .select(`
        *,
        students (
          id,
          full_name,
          branch,
          level,
          baptized,
          phone,
          service_id
        ),
        sessions (
          id,
          code,
          date,
          service_id
        )
      `)

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    if (serviceId) {
      query = query.eq('students.service_id', serviceId)
    }

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erreur stats:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des stats' },
        { status: 500 }
      )
    }

    // Calculer les statistiques globales
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
      byBranch: {} as Record<string, { total: number; present: number; absent: number; late: number }>,
      baptized: data.filter(a => a.students?.baptized).length
    }

    // Statistiques par service
    data.forEach(record => {
      if (record.students?.service_id) {
        const serviceId = record.students.service_id
        stats.byService[serviceId] = (stats.byService[serviceId] || 0) + 1
      }
    })

    // Statistiques par branche
    data.forEach(record => {
      if (record.students?.branch) {
        const branch = record.students.branch
        if (!stats.byBranch[branch]) {
          stats.byBranch[branch] = { total: 0, present: 0, absent: 0, late: 0 }
        }
        stats.byBranch[branch].total++
        
        if (record.status === 'present') stats.byBranch[branch].present++
        else if (record.status === 'absent') stats.byBranch[branch].absent++
        else if (record.status === 'late') stats.byBranch[branch].late++
      }
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
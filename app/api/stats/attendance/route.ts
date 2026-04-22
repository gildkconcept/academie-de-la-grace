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
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('serviceId')
    const method = searchParams.get('method')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Requête principale
    let query = supabase
      .from('service_attendance')
      .select(`
        id,
        status,
        method,
        student_id,
        service_session_id,
        students!inner (
          id,
          full_name,
          branch,
          level,
          service_id
        ),
        service_sessions!inner (
          id,
          service_id,
          date,
          type
        )
      `)

    // Filtre par service
    if (serviceId && serviceId !== 'all') {
      query = query.eq('students.service_id', serviceId)
    }

    // Filtre par méthode
    if (method && method !== 'all') {
      query = query.eq('method', method)
    }

    // Filtre par date
    if (startDate && endDate) {
      query = query.gte('service_sessions.date', startDate).lte('service_sessions.date', endDate)
    }

    const { data: attendances, error } = await query

    if (error) {
      console.error('Erreur requête:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Récupérer les services pour les noms
    const { data: services } = await supabase.from('services').select('id, name')
    const serviceMap = new Map(services?.map(s => [s.id, s.name]))

    // Calcul des statistiques
    const total = attendances?.length || 0
    const present = attendances?.filter(a => a.status === 'present').length || 0
    const absent = attendances?.filter(a => a.status === 'absent').length || 0
    const late = attendances?.filter(a => a.status === 'late').length || 0

    const codeAttendances = attendances?.filter(a => a.method === 'code') || []
    const manualAttendances = attendances?.filter(a => a.method === 'manual') || []

    const stats = {
      total,
      present,
      absent,
      late,
      byMethod: {
        code: {
          total: codeAttendances.length,
          present: codeAttendances.filter(a => a.status === 'present').length || 0
        },
        manual: {
          total: manualAttendances.length,
          present: manualAttendances.filter(a => a.status === 'present').length || 0
        }
      }
    }

    // Liste détaillée - correction de l'accès aux propriétés
    const details = attendances?.map(a => {
      // Récupérer les données de l'étudiant depuis la jointure
      const studentData = a.students as unknown as {
        id: string
        full_name: string
        branch: string
        level: number
        service_id: string
      }
      const sessionData = a.service_sessions as unknown as {
        id: string
        service_id: string
        date: string
        type: string
      }

      return {
        id: a.id,
        studentName: studentData?.full_name || 'N/A',
        serviceName: serviceMap.get(studentData?.service_id) || studentData?.service_id,
        level: studentData?.level,
        branch: studentData?.branch,
        status: a.status === 'present' ? 'Présent' : a.status === 'late' ? 'Retard' : 'Absent',
        method: a.method === 'code' ? 'Code' : 'Manuel',
        date: sessionData?.date,
        hasPhone: false
      }
    }) || []

    return NextResponse.json({ stats, details })
  } catch (error) {
    console.error('Erreur stats attendance:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
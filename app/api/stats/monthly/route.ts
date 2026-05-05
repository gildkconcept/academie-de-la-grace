import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || (user.role !== 'service_manager' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer les 6 derniers mois
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const startDate = sixMonthsAgo.toISOString().split('T')[0]

    let query = supabase
      .from('attendance')
      .select('date, status')
      .gte('date', startDate)
      .order('date', { ascending: true })

    // Filtrer par service si manager
    if (user.role === 'service_manager' && user.serviceId) {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('service_id', user.serviceId)
      
      if (students) {
        query = query.in('student_id', students.map(s => s.id))
      }
    }

    const { data: attendanceData } = await query

    // Grouper par mois
    const months: Record<string, { presents: number; total: number }> = {}
    
    attendanceData?.forEach(record => {
      const month = new Date(record.date).toLocaleDateString('fr-FR', { month: 'short' })
      const monthKey = month.charAt(0).toUpperCase() + month.slice(1)
      
      if (!months[monthKey]) {
        months[monthKey] = { presents: 0, total: 0 }
      }
      
      months[monthKey].total++
      if (record.status === 'present') {
        months[monthKey].presents++
      }
    })

    const monthlyStats = Object.entries(months).map(([month, data]) => ({
      month,
      presents: data.presents,
      total: data.total
    }))

    // Statistiques de baptême
    let baptismQuery = supabase
      .from('students')
      .select('baptized', { count: 'exact' })
      .is('deleted_at', null)

    if (user.role === 'service_manager' && user.serviceId) {
      baptismQuery = baptismQuery.eq('service_id', user.serviceId)
    }

    const { data: baptismData } = await baptismQuery

    const baptized = baptismData?.filter(s => s.baptized === true || s.baptized === 'true').length || 0
    const notBaptized = (baptismData?.length || 0) - baptized

    return NextResponse.json({
      monthly: monthlyStats,
      baptism: [
        { name: 'Baptisés', value: baptized },
        { name: 'Non baptisés', value: notBaptized }
      ]
    })
  } catch (error) {
    console.error('Erreur stats monthly:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
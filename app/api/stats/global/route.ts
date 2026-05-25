// app/api/stats/global/route.ts (version corrigée)
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
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // 1. Récupérer tous les étudiants
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, service_id, level')
      .is('deleted_at', null)

    if (studentsError) throw studentsError

    // 2. Récupérer toutes les présences
    const { data: attendances, error: attendanceError } = await supabase
      .from('attendance')
      .select('student_id, status')

    if (attendanceError) throw attendanceError

    const totalPresent = attendances?.filter(a => a.status === 'present').length || 0
    const totalRecords = attendances?.length || 0
    const globalRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0

    // 3. Récupérer les services
    const { data: services } = await supabase.from('services').select('id, name')
    
    // 4. Calculer les stats par service
    const serviceStats = []
    for (const service of services || []) {
      const serviceStudents = students?.filter(s => s.service_id === service.id) || []
      const studentIds = serviceStudents.map(s => s.id)
      
      if (studentIds.length === 0) {
        serviceStats.push({
          serviceId: service.id,
          serviceName: service.name,
          rate: 0,
          totalStudents: 0,
          presentCount: 0
        })
        continue
      }
      
      const serviceAttendances = attendances?.filter(a => studentIds.includes(a.student_id)) || []
      const present = serviceAttendances.filter(a => a.status === 'present').length
      const total = serviceAttendances.length
      const rate = total > 0 ? Math.round((present / total) * 100) : 0
      
      serviceStats.push({
        serviceId: service.id,
        serviceName: service.name,
        rate,
        totalStudents: studentIds.length,
        presentCount: present
      })
    }

    const sorted = [...serviceStats].sort((a, b) => b.rate - a.rate)
    
    // Données fictives pour l'évolution (à remplacer par de vraies données)
    const attendanceOverTime = [
      { month: 'Jan', rate: 65, present: 45, total: 70 },
      { month: 'Fév', rate: 58, present: 40, total: 69 },
      { month: 'Mar', rate: 62, present: 43, total: 70 },
      { month: 'Avr', rate: 55, present: 38, total: 69 },
      { month: 'Mai', rate: 51, present: 35, total: 69 }
    ]

    return NextResponse.json({
      totalStudents: students?.length || 0,
      totalServices: services?.length || 0,
      totalAttendance: totalPresent,
      expectedAttendance: totalRecords,
      globalAttendanceRate: globalRate,
      bestService: sorted[0] || null,
      strugglingService: sorted[sorted.length - 1] || null,
      attendanceByService: serviceStats,
      attendanceOverTime
    })
  } catch (error) {
    console.error('Erreur stats global:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
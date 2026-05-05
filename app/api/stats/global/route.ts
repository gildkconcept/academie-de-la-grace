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
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Taux de présence global
    const { data: allAttendance } = await supabase
      .from('attendance')
      .select('status')
    
    const totalPresent = allAttendance?.filter(a => a.status === 'present').length || 0
    const totalRecords = allAttendance?.length || 0
    const globalRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0

    // Taux par service
    const { data: services } = await supabase.from('services').select('id, name')
    const serviceStats = []
    
    for (const service of services || []) {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('service_id', service.id)
      
      const studentIds = students?.map(s => s.id) || []
      if (studentIds.length === 0) {
        serviceStats.push({ serviceId: service.id, serviceName: service.name, rate: 0, totalStudents: 0, presentCount: 0 })
        continue
      }
      
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .in('student_id', studentIds)
      
      const present = attendance?.filter(a => a.status === 'present').length || 0
      const total = attendance?.length || 0
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

    return NextResponse.json({
      totalStudents: 0,
      totalServices: services?.length || 0,
      totalAttendance: totalPresent,
      expectedAttendance: totalRecords,
      globalAttendanceRate: globalRate,
      bestService: sorted[0] || null,
      strugglingService: sorted[sorted.length - 1] || null,
      attendanceByService: serviceStats,
      attendanceOverTime: []
    })
  } catch (error) {
    console.error('Erreur stats global:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const token = authHeader.split(' ')[1]
  const user = verifyToken(token)
  if (!user || (user.role !== 'service_manager' && user.role !== 'superadmin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const serviceId = user.role === 'service_manager' ? user.serviceId : (new URL(request.url)).searchParams.get('serviceId')
  if (!serviceId) {
    return NextResponse.json({ error: 'Service ID requis' }, { status: 400 })
  }

  // Récupérer les étudiants du service
  const { data: students } = await supabase
    .from('students')
    .select('id, full_name, level, baptized, phone, username')
    .eq('service_id', serviceId)

  // Récupérer les présences de ces étudiants
  const studentIds = students?.map(s => s.id) || []
  const { data: attendance } = await supabase
    .from('attendance')
    .select('student_id, status')
    .in('student_id', studentIds)

  // Calculer le taux de présence par étudiant
  const studentStats = students?.map(student => {
    const studentAttendance = attendance?.filter(a => a.student_id === student.id) || []
    const presentCount = studentAttendance.filter(a => a.status === 'present').length
    const totalCount = studentAttendance.length
    const rate = totalCount > 0 ? (presentCount / totalCount) * 100 : 0
    const isActive = rate >= 70
    return {
      ...student,
      presenceRate: rate,
      presentCount,
      totalCount,
      isActive
    }
  }) || []

  const serviceRate = studentStats.reduce((acc, s) => acc + s.presenceRate, 0) / (studentStats.length || 1)
  const activeCount = studentStats.filter(s => s.isActive).length
  const inactiveCount = studentStats.length - activeCount

  return NextResponse.json({
    serviceId,
    serviceRate,
    activeCount,
    inactiveCount,
    students: studentStats
  })
}
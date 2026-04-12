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
  if (!user || user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // Taux de présence global
  const { data: allAttendance } = await supabase
    .from('attendance')
    .select('status')
  const totalPresent = allAttendance?.filter(a => a.status === 'present').length || 0
  const totalRecords = allAttendance?.length || 0
  const globalRate = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0

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
      serviceStats.push({ ...service, rate: 0, totalPresent: 0, totalExpected: 0 })
      continue
    }
    const { data: attendance } = await supabase
      .from('attendance')
      .select('status')
      .in('student_id', studentIds)
    const present = attendance?.filter(a => a.status === 'present').length || 0
    const total = attendance?.length || 0
    const rate = total > 0 ? (present / total) * 100 : 0
    serviceStats.push({ ...service, rate, totalPresent: present, totalExpected: total })
  }
  // Meilleur et moins bon service
  const sorted = [...serviceStats].sort((a,b) => b.rate - a.rate)
  const bestService = sorted[0] || null
  const worstService = sorted[sorted.length-1] || null

  return NextResponse.json({
    globalRate,
    serviceStats,
    bestService,
    worstService,
    totalPresent,
    totalExpected: totalRecords
  })
}
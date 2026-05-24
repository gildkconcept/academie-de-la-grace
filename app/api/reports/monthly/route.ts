// app/api/reports/monthly/route.ts
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

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || new Date().getMonth().toString())
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const serviceFilter = searchParams.get('serviceId') || 'all'
    const levelFilter = searchParams.get('level') || 'all'
    const branchFilter = searchParams.get('branch') || 'all'

    // Date de début et fin du mois
    const startDate = new Date(year, month, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

    console.log(`📊 Génération rapport mensuel: ${startDate} → ${endDate}`)

    // 1. Récupérer tous les étudiants
    let studentsQuery = supabase
      .from('students')
      .select(`
        id,
        full_name,
        branch,
        level,
        service_id,
        baptized,
        phone,
        username,
        services (id, name)
      `)
      .is('deleted_at', null)

    if (serviceFilter !== 'all') {
      studentsQuery = studentsQuery.eq('service_id', serviceFilter)
    }
    if (levelFilter !== 'all') {
      studentsQuery = studentsQuery.eq('level', parseInt(levelFilter))
    }
    if (branchFilter !== 'all') {
      studentsQuery = studentsQuery.eq('branch', branchFilter)
    }

    const { data: students, error: studentsError } = await studentsQuery

    if (studentsError) {
      console.error('Erreur étudiants:', studentsError)
      return NextResponse.json({ error: studentsError.message }, { status: 500 })
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        stats: {
          totalStudents: 0,
          totalPresent: 0,
          totalAbsent: 0,
          globalRate: 0,
          globalAbsenceRate: 0
        },
        byService: [],
        byLevel: [],
        byBranch: [],
        weeklyEvolution: [],
        studentsDetails: [],
        alerts: { lowParticipationServices: [], frequentAbsentStudents: [], dropFromPreviousMonth: null }
      })
    }

    const studentIds = students.map(s => s.id)

    // 2. Récupérer toutes les sessions du mois
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, date')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (sessionsError) {
      console.error('Erreur sessions:', sessionsError)
      return NextResponse.json({ error: sessionsError.message }, { status: 500 })
    }

    const totalSessions = sessions?.length || 0
    const maxPossiblePresences = studentIds.length * totalSessions

    // 3. Récupérer toutes les présences du mois
    const { data: attendances, error: attendancesError } = await supabase
      .from('attendance')
      .select('student_id, status, date, session_id')
      .in('student_id', studentIds)
      .gte('date', startDate)
      .lte('date', endDate)

    if (attendancesError) {
      console.error('Erreur présences:', attendancesError)
      return NextResponse.json({ error: attendancesError.message }, { status: 500 })
    }

    // Créer un map des présences par étudiant
    const attendanceMap = new Map<string, { present: number; absent: number; late: number; details: any[] }>()
    const sessionsByDate = new Map<string, string[]>()

    // Grouper les sessions par date
    sessions?.forEach(session => {
      if (!sessionsByDate.has(session.date)) {
        sessionsByDate.set(session.date, [])
      }
      sessionsByDate.get(session.date)!.push(session.id)
    })

    // Initialiser les stats pour chaque étudiant
    students.forEach(student => {
      attendanceMap.set(student.id, { present: 0, absent: 0, late: 0, details: [] })
    })

    // Compter les présences
    attendances?.forEach(att => {
      const stats = attendanceMap.get(att.student_id)
      if (stats) {
        if (att.status === 'present') {
          stats.present++
        } else if (att.status === 'late') {
          stats.late++
          // Un retard compte comme une présence pour le taux global? Non, on compte séparément
        } else if (att.status === 'absent') {
          stats.absent++
        }
        stats.details.push(att)
      }
    })

    // Calculer les totaux
    let totalPresent = 0
    let totalAbsent = 0
    let totalLate = 0

    const studentsDetails = students.map(student => {
      const stats = attendanceMap.get(student.id) || { present: 0, absent: 0, late: 0, details: [] }
      const expectedPresences = totalSessions
      const presenceRate = expectedPresences > 0 ? Math.round((stats.present / expectedPresences) * 100) : 0
      const absenceRate = expectedPresences > 0 ? Math.round((stats.absent / expectedPresences) * 100) : 0
      
      totalPresent += stats.present
      totalAbsent += stats.absent
      totalLate += stats.late

      return {
        id: student.id,
        name: student.full_name,
        username: student.username,
        serviceId: student.service_id,
        serviceName: (student.services as any)?.name || 'N/A',
        branch: student.branch,
        level: student.level,
        baptized: student.baptized,
        phone: student.phone,
        presentCount: stats.present,
        absentCount: stats.absent,
        lateCount: stats.late,
        expectedPresences,
        presenceRate,
        absenceRate
      }
    })

    // 4. Statistiques par service
    const serviceMap = new Map<string, { name: string; studentCount: number; present: number; absent: number; late: number }>()
    
    studentsDetails.forEach(student => {
      if (!serviceMap.has(student.serviceId)) {
        serviceMap.set(student.serviceId, {
          name: student.serviceName,
          studentCount: 0,
          present: 0,
          absent: 0,
          late: 0
        })
      }
      const service = serviceMap.get(student.serviceId)!
      service.studentCount++
      service.present += student.presentCount
      service.absent += student.absentCount
      service.late += student.lateCount
    })

    const byService = Array.from(serviceMap.entries()).map(([id, data]) => ({
      serviceId: id,
      serviceName: data.name,
      studentCount: data.studentCount,
      totalPresent: data.present,
      totalAbsent: data.absent,
      totalLate: data.late,
      expectedPresences: data.studentCount * totalSessions,
      rate: data.studentCount * totalSessions > 0 ? Math.round((data.present / (data.studentCount * totalSessions)) * 100) : 0
    })).sort((a, b) => b.rate - a.rate)

    // 5. Statistiques par niveau
    const levelMap = new Map<number, { present: number; absent: number; late: number; studentCount: number }>()
    
    studentsDetails.forEach(student => {
      if (!levelMap.has(student.level)) {
        levelMap.set(student.level, { present: 0, absent: 0, late: 0, studentCount: 0 })
      }
      const level = levelMap.get(student.level)!
      level.studentCount++
      level.present += student.presentCount
      level.absent += student.absentCount
      level.late += student.lateCount
    })

    const byLevel = Array.from(levelMap.entries()).map(([level, data]) => ({
      level,
      studentCount: data.studentCount,
      totalPresent: data.present,
      totalAbsent: data.absent,
      totalLate: data.late,
      expectedPresences: data.studentCount * totalSessions,
      rate: data.studentCount * totalSessions > 0 ? Math.round((data.present / (data.studentCount * totalSessions)) * 100) : 0
    })).sort((a, b) => a.level - b.level)

    // 6. Statistiques par branche
    const branchMap = new Map<string, { present: number; absent: number; late: number; studentCount: number }>()
    
    studentsDetails.forEach(student => {
      if (!branchMap.has(student.branch)) {
        branchMap.set(student.branch, { present: 0, absent: 0, late: 0, studentCount: 0 })
      }
      const branch = branchMap.get(student.branch)!
      branch.studentCount++
      branch.present += student.presentCount
      branch.absent += student.absentCount
      branch.late += student.lateCount
    })

    const byBranch = Array.from(branchMap.entries()).map(([branch, data]) => ({
      branch,
      studentCount: data.studentCount,
      totalPresent: data.present,
      totalAbsent: data.absent,
      totalLate: data.late,
      expectedPresences: data.studentCount * totalSessions,
      rate: data.studentCount * totalSessions > 0 ? Math.round((data.present / (data.studentCount * totalSessions)) * 100) : 0
    })).sort((a, b) => b.rate - a.rate)

    // 7. Évolution hebdomadaire
    const weeklyEvolution: { week: number; label: string; present: number; absent: number; rate: number }[] = []
    
    // Obtenir les semaines du mois
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const weeks: { start: Date; end: Date; weekNum: number }[] = []
    
    let currentWeekStart = new Date(firstDay)
    let weekCounter = 1
    
    while (currentWeekStart <= lastDay) {
      const weekEnd = new Date(currentWeekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      weeks.push({
        start: new Date(currentWeekStart),
        end: weekEnd > lastDay ? lastDay : weekEnd,
        weekNum: weekCounter
      })
      currentWeekStart.setDate(currentWeekStart.getDate() + 7)
      weekCounter++
    }

    // Pour chaque semaine, compter les présences
    weeks.forEach(week => {
      const weekStartStr = week.start.toISOString().split('T')[0]
      const weekEndStr = week.end.toISOString().split('T')[0]
      
      const weekSessions = sessions?.filter(s => s.date >= weekStartStr && s.date <= weekEndStr) || []
      const weekSessionsCount = weekSessions.length
      
      if (weekSessionsCount === 0) {
        weeklyEvolution.push({
          week: week.weekNum,
          label: `Semaine ${week.weekNum}`,
          present: 0,
          absent: 0,
          rate: 0
        })
        return
      }
      
      let weekPresent = 0
      let weekAbsent = 0
      
      studentsDetails.forEach(student => {
        const weekAttendances = attendances?.filter(a => 
          a.student_id === student.id && 
          a.date >= weekStartStr && 
          a.date <= weekEndStr &&
          a.status === 'present'
        ) || []
        weekPresent += weekAttendances.length
        weekAbsent += (weekSessionsCount - weekAttendances.length)
      })
      
      const expected = students.length * weekSessionsCount
      const rate = expected > 0 ? Math.round((weekPresent / expected) * 100) : 0
      
      weeklyEvolution.push({
        week: week.weekNum,
        label: `S${week.weekNum}`,
        present: weekPresent,
        absent: weekAbsent,
        rate
      })
    })

    // 8. Alertes intelligentes
    const lowParticipationServices = byService.filter(s => s.rate < 50)
    const frequentAbsentStudents = studentsDetails
      .filter(s => s.presenceRate < 30 && s.expectedPresences > 5)
      .sort((a, b) => a.presenceRate - b.presenceRate)
      .slice(0, 10)
    
    // Comparaison avec le mois précédent
    const prevMonthDate = new Date(year, month - 1, 1)
    const prevMonthStart = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1).toISOString().split('T')[0]
    const prevMonthEnd = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).toISOString().split('T')[0]
    
    let dropFromPreviousMonth: { rate: number; prevRate: number; change: number } | null = null
    
    if (month > 0 || year > 2024) {
      const { data: prevAttendances } = await supabase
        .from('attendance')
        .select('student_id, status')
        .in('student_id', studentIds)
        .gte('date', prevMonthStart)
        .lte('date', prevMonthEnd)
      
      const { data: prevSessions } = await supabase
        .from('sessions')
        .select('id')
        .gte('date', prevMonthStart)
        .lte('date', prevMonthEnd)
      
      const prevSessionsCount = prevSessions?.length || 0
      const prevPresentCount = prevAttendances?.filter(a => a.status === 'present').length || 0
      const prevExpected = studentIds.length * prevSessionsCount
      const prevRate = prevExpected > 0 ? Math.round((prevPresentCount / prevExpected) * 100) : 0
      const currentRate = totalSessions > 0 ? Math.round((totalPresent / (studentIds.length * totalSessions)) * 100) : 0
      
      dropFromPreviousMonth = {
        rate: currentRate,
        prevRate,
        change: currentRate - prevRate
      }
    }

    const globalRate = totalSessions > 0 ? Math.round((totalPresent / (studentIds.length * totalSessions)) * 100) : 0
    const globalAbsenceRate = totalSessions > 0 ? Math.round((totalAbsent / (studentIds.length * totalSessions)) * 100) : 0

    return NextResponse.json({
      stats: {
        totalStudents: students.length,
        totalSessions,
        totalPresent,
        totalAbsent,
        totalLate,
        globalRate,
        globalAbsenceRate,
        maxPossiblePresences
      },
      byService,
      byLevel,
      byBranch,
      weeklyEvolution,
      studentsDetails,
      alerts: {
        lowParticipationServices: lowParticipationServices.map(s => ({ ...s, type: 'LOW_PARTICIPATION' })),
        frequentAbsentStudents: frequentAbsentStudents.map(s => ({ 
          id: s.id, 
          name: s.name, 
          rate: s.presenceRate, 
          type: 'FREQUENT_ABSENT' 
        })),
        dropFromPreviousMonth
      }
    })

  } catch (error) {
    console.error('Erreur rapport mensuel:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
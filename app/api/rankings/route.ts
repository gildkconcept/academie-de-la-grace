// app/api/rankings/route.ts
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
    const levelFilter = searchParams.get('level')
    const serviceFilter = searchParams.get('serviceId')

    // 1. Récupérer tous les étudiants
    let studentsQuery = supabase
      .from('students')
      .select('id, full_name, username, profile_image_url, branch, level, service_id, baptized')
      .is('deleted_at', null)

    if (levelFilter && levelFilter !== 'all') {
      studentsQuery = studentsQuery.eq('level', parseInt(levelFilter))
    }

    const { data: students, error: studentsError } = await studentsQuery

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 })
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ rankings: [], stats: { totalStudents: 0, averageScore: 0 } })
    }

    // 2. Récupérer les services
    const { data: services } = await supabase
      .from('services')
      .select('id, name')

    const serviceMap = new Map(services?.map(s => [s.id, s.name]) || [])

    // 3. Récupérer les quiz results
    const { data: quizResults } = await supabase
      .from('quiz_results')
      .select('student_id, percentage')

    // 4. Récupérer les sessions et présences
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')

    const totalSessions = sessions?.length || 1

    const { data: attendances } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('status', 'present')

    // Compter les présences par étudiant
    const presenceCount: Record<string, number> = {}
    attendances?.forEach(a => {
      presenceCount[a.student_id] = (presenceCount[a.student_id] || 0) + 1
    })

    // Grouper les quiz par étudiant
    const quizScores: Record<string, { total: number; count: number }> = {}
    quizResults?.forEach(q => {
      if (!quizScores[q.student_id]) {
        quizScores[q.student_id] = { total: 0, count: 0 }
      }
      quizScores[q.student_id].total += q.percentage
      quizScores[q.student_id].count++
    })

    // 5. Calculer les scores et créer le classement
    let rankings = students.map(student => {
      const quizData = quizScores[student.id] || { total: 0, count: 0 }
      const quizAvg = quizData.count > 0 ? quizData.total / quizData.count : 0
      const presenceRate = (presenceCount[student.id] || 0) / totalSessions * 100
      
      const finalScore = (quizAvg * 0.6) + (presenceRate * 0.4)

      return {
        id: crypto.randomUUID(),
        student_id: student.id,
        final_score: Math.round(finalScore),
        attendance_score: Math.round(presenceRate),
        quiz_score: Math.round(quizAvg),
        student: {
          id: student.id,
          full_name: student.full_name,
          username: student.username,
          profile_image_url: student.profile_image_url,
          branch: student.branch,
          level: student.level,
          service_id: student.service_id,
          service_name: serviceMap.get(student.service_id) || '-',
          baptized: student.baptized
        }
      }
    })

    // Filtrer par service si nécessaire
    if (serviceFilter && serviceFilter !== 'all') {
      rankings = rankings.filter(r => r.student.service_id === serviceFilter)
    }

    // Trier par score
    rankings.sort((a, b) => b.final_score - a.final_score)

    // Ajouter le rang
    const rankingsWithRank = rankings.map((r, index) => ({
      ...r,
      rank: index + 1
    }))

    // Statistiques
    const stats = {
      totalStudents: rankingsWithRank.length,
      averageScore: rankingsWithRank.length > 0 
        ? Math.round(rankingsWithRank.reduce((acc, r) => acc + r.final_score, 0) / rankingsWithRank.length)
        : 0,
      topStudent: rankingsWithRank[0] || null
    }

    console.log('📊 Classement généré:', rankingsWithRank.length, 'étudiants')

    return NextResponse.json({
      rankings: rankingsWithRank,
      stats,
      period: { type: 'all', start: null, end: new Date() }
    })
  } catch (error) {
    console.error('Erreur classement:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
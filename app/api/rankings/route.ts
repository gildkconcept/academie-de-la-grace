// app/api/rankings/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  console.log('🔵 [API RANKINGS] Début de la requête')
  
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    console.log('🔵 [API RANKINGS] Token présent:', !!token)
    
    if (!token) {
      console.log('🔴 [API RANKINGS] Token manquant')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    console.log('🔵 [API RANKINGS] Utilisateur:', user?.role, user?.id)
    
    if (!user || user.role !== 'superadmin') {
      console.log('🔴 [API RANKINGS] Accès refusé - rôle:', user?.role)
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const levelFilter = searchParams.get('level')
    const serviceFilter = searchParams.get('serviceId')
    const branchFilter = searchParams.get('branch')
    
    console.log('🔵 [API RANKINGS] Filtres:', { levelFilter, serviceFilter, branchFilter })

    // 1. Récupérer tous les étudiants
    console.log('🔵 [API RANKINGS] Récupération des étudiants...')
    let studentsQuery = supabase
      .from('students')
      .select('id, full_name, username, profile_image_url, branch, level, service_id, baptized')
      .is('deleted_at', null)

    if (levelFilter && levelFilter !== 'all') {
      studentsQuery = studentsQuery.eq('level', parseInt(levelFilter))
    }

    const { data: students, error: studentsError } = await studentsQuery

    if (studentsError) {
      console.log('🔴 [API RANKINGS] Erreur étudiants:', studentsError.message)
      return NextResponse.json({ error: studentsError.message }, { status: 500 })
    }

    console.log('✅ [API RANKINGS] Étudiants trouvés:', students?.length)
    console.log('📊 [API RANKINGS] Premier étudiant:', students?.[0]?.full_name)

    if (!students || students.length === 0) {
      console.log('🟡 [API RANKINGS] Aucun étudiant trouvé')
      return NextResponse.json({ rankings: [], stats: { totalStudents: 0, averageScore: 0 } })
    }

    // 2. Récupérer les services
    console.log('🔵 [API RANKINGS] Récupération des services...')
    const { data: services } = await supabase.from('services').select('id, name')
    console.log('✅ [API RANKINGS] Services trouvés:', services?.length)

    const serviceMap = new Map(services?.map(s => [s.id, s.name]) || [])

    // 3. Récupérer les quiz results
    console.log('🔵 [API RANKINGS] Récupération des quiz results...')
    const { data: quizResults, error: quizError } = await supabase
      .from('quiz_results')
      .select('student_id, percentage')
    
    if (quizError) {
      console.log('🔴 [API RANKINGS] Erreur quiz:', quizError.message)
    }
    console.log('✅ [API RANKINGS] Quiz results trouvés:', quizResults?.length)
    
    // 4. Récupérer les sessions
    console.log('🔵 [API RANKINGS] Récupération des sessions...')
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id')
    
    if (sessionsError) {
      console.log('🔴 [API RANKINGS] Erreur sessions:', sessionsError.message)
    }
    const totalSessions = sessions?.length || 1
    console.log('✅ [API RANKINGS] Total sessions:', totalSessions)

    // 5. Récupérer les présences
    console.log('🔵 [API RANKINGS] Récupération des présences...')
    const { data: attendances, error: attendanceError } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('status', 'present')
    
    if (attendanceError) {
      console.log('🔴 [API RANKINGS] Erreur présence:', attendanceError.message)
    }
    console.log('✅ [API RANKINGS] Présences trouvées:', attendances?.length)

    // Compter les présences par étudiant
    const presenceCount: Record<string, number> = {}
    attendances?.forEach(a => {
      presenceCount[a.student_id] = (presenceCount[a.student_id] || 0) + 1
    })
    console.log('📊 [API RANKINGS] Exemple présence count:', Object.entries(presenceCount).slice(0, 3))

    // Grouper les quiz par étudiant
    const quizScores: Record<string, { total: number; count: number }> = {}
    quizResults?.forEach(q => {
      if (!quizScores[q.student_id]) {
        quizScores[q.student_id] = { total: 0, count: 0 }
      }
      quizScores[q.student_id].total += q.percentage
      quizScores[q.student_id].count++
    })
    console.log('📊 [API RANKINGS] Étudiants avec quiz:', Object.keys(quizScores).length)

    // 6. Calculer les scores
    console.log('🔵 [API RANKINGS] Calcul des scores...')
    let rankings = students.map(student => {
      const quizData = quizScores[student.id] || { total: 0, count: 0 }
      const quizAvg = quizData.count > 0 ? quizData.total / quizData.count : 0
      const presenceRate = (presenceCount[student.id] || 0) / totalSessions * 100
      const finalScore = (quizAvg * 0.6) + (presenceRate * 0.4)

      console.log(`📊 [API RANKINGS] ${student.full_name}: quiz=${quizAvg.toFixed(1)}%, présence=${presenceRate.toFixed(1)}%, final=${finalScore.toFixed(1)}%`)

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
          branch: student.branch || '-',
          level: student.level,
          service_id: student.service_id,
          service_name: serviceMap.get(student.service_id) || '-',
          baptized: student.baptized
        }
      }
    })

    // Filtrer par service si nécessaire
    if (serviceFilter && serviceFilter !== 'all') {
      console.log('🔵 [API RANKINGS] Filtrage par service:', serviceFilter)
      rankings = rankings.filter(r => r.student.service_id === serviceFilter)
    }

    // Filtrer par branche si nécessaire
    if (branchFilter && branchFilter !== 'all') {
      console.log('🔵 [API RANKINGS] Filtrage par branche:', branchFilter)
      rankings = rankings.filter(r => r.student.branch === branchFilter)
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

    console.log('✅ [API RANKINGS] Classement généré avec succès!')
    console.log('📊 [API RANKINGS] Total étudiants classés:', rankingsWithRank.length)
    console.log('📊 [API RANKINGS] Score moyen:', stats.averageScore)
    console.log('📊 [API RANKINGS] Top 3:', rankingsWithRank.slice(0, 3).map(r => `${r.rank}. ${r.student.full_name} - ${r.final_score}%`))

    return NextResponse.json({
      rankings: rankingsWithRank,
      stats,
      period: { type: 'all', start: null, end: new Date() }
    })
  } catch (error) {
    console.error('🔴 [API RANKINGS] Erreur fatale:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
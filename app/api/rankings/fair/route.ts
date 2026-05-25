// app/api/rankings/fair/route.ts
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
    const branchFilter = searchParams.get('branch')

    console.log('🔵 [FAIR API] ========== DÉBUT ==========')
    console.log('🔵 [FAIR API] Filtres:', { levelFilter, serviceFilter, branchFilter })

    // 1. Récupérer tous les étudiants
    let studentsQuery = supabase
      .from('students')
      .select('id, full_name, username, profile_image_url, branch, level, service_id, baptized, created_at')
      .is('deleted_at', null)

    if (levelFilter && levelFilter !== 'all') {
      studentsQuery = studentsQuery.eq('level', parseInt(levelFilter))
    }

    const { data: students } = await studentsQuery
    console.log('📊 [FAIR API] Étudiants:', students?.length)

    if (!students || students.length === 0) {
      return NextResponse.json({ rankings: [], stats: { totalStudents: 0, averageScore: 0 } })
    }

    // 2. Récupérer les services
    const { data: services } = await supabase.from('services').select('id, name')
    const serviceMap = new Map(services?.map(s => [s.id, s.name]) || [])

    // 3. Récupérer tous les quizzes par niveau
    const { data: allQuizzes } = await supabase
      .from('quizzes')
      .select('id, title, level, created_at, end_date')
    
    console.log('📊 [FAIR API] Quiz par niveau:')
    const quizByLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0 }
    allQuizzes?.forEach(q => {
      if (q.level >= 1 && q.level <= 3) quizByLevel[q.level]++
    })
    console.log(`   Niveau 1: ${quizByLevel[1]} quiz`)
    console.log(`   Niveau 2: ${quizByLevel[2]} quiz`)
    console.log(`   Niveau 3: ${quizByLevel[3]} quiz`)

    // 4. Récupérer les résultats des quiz
    const { data: quizResults } = await supabase
      .from('quiz_results')
      .select('student_id, quiz_id, percentage')

    // Map des résultats : student_id -> Map(quiz_id -> percentage)
    const resultsMap = new Map()
    quizResults?.forEach(r => {
      if (!resultsMap.has(r.student_id)) {
        resultsMap.set(r.student_id, new Map())
      }
      resultsMap.get(r.student_id).set(r.quiz_id, r.percentage)
    })

    // 5. Récupérer les sessions
    const { data: allSessions } = await supabase
      .from('sessions')
      .select('id, date')
      .order('date', { ascending: true })

    console.log('📊 [FAIR API] Sessions totales:', allSessions?.length || 0)

    // 6. Récupérer les présences
    const { data: attendances } = await supabase
      .from('attendance')
      .select('student_id, session_id, status')
      .eq('status', 'present')

    // Map des présences : student_id -> Set(session_id)
    const presenceMap = new Map()
    attendances?.forEach(a => {
      if (!presenceMap.has(a.student_id)) {
        presenceMap.set(a.student_id, new Set())
      }
      presenceMap.get(a.student_id).add(a.session_id)
    })

    console.log('📊 [FAIR API] Présences totales:', attendances?.length || 0)

    // 7. Calculer le classement équitable
    console.log('\n🔵 [FAIR API] ========== CALCULS INDIVIDUELS ==========')
    
    const rankings = students.map(student => {
      const studentLevel = student.level || 1
      
      // === QUIZ - Ne prendre que les quiz du MÊME NIVEAU ===
      const relevantQuizzes = allQuizzes?.filter(q => q.level === studentLevel) || []
      const studentResults = resultsMap.get(student.id) || new Map()
      
      // Compter uniquement les quiz du bon niveau
      let totalQuizScore = 0
      let validCompletedCount = 0
      
      for (const quiz of relevantQuizzes) {
        const userScore = studentResults.get(quiz.id)
        if (userScore !== undefined) {
          totalQuizScore += userScore
          validCompletedCount++
        }
      }
      
      const fairQuizScore = relevantQuizzes.length > 0 ? totalQuizScore / relevantQuizzes.length : 0
      
      // === PRÉSENCES - CORRIGÉ ===
      const studentPresences = presenceMap.get(student.id) || new Set()
      const totalSessions = allSessions?.length || 0
      
      // Compter les présences uniquement pour les sessions qui existent
      let presenceCount = 0
      const presentSessionIds = new Set()
      
      for (const session of (allSessions || [])) {
        if (studentPresences.has(session.id)) {
          presenceCount++
          presentSessionIds.add(session.id)
        }
      }
      
      // Vérifier les présences qui pointent vers des sessions inexistantes
      let orphanPresences = 0
      for (const sessionId of studentPresences) {
        const sessionExists = allSessions?.some(s => s.id === sessionId)
        if (!sessionExists) {
          orphanPresences++
          console.log(`⚠️ [FAIR API] Présence orpheline pour ${student.full_name}: session_id=${sessionId} (n'existe plus)`)
        }
      }
      
      const fairPresenceRate = totalSessions > 0 ? (presenceCount / totalSessions) * 100 : 0
      
      // Score final (60% quiz, 40% présence)
      const finalScore = (fairQuizScore * 0.6) + (fairPresenceRate * 0.4)
      
      // Log détaillé pour chaque étudiant (uniquement les plus pertinents)
      if (validCompletedCount > 0 || presenceCount > 0 || orphanPresences > 0) {
        console.log(`\n📊 ${student.full_name} (Niv.${studentLevel}):`)
        console.log(`   - Quiz: ${validCompletedCount}/${relevantQuizzes.length} complétés`)
        console.log(`   - Score quiz moyen: ${fairQuizScore.toFixed(1)}%`)
        console.log(`   - Présences: ${presenceCount}/${totalSessions}`)
        if (orphanPresences > 0) {
          console.log(`   - ⚠️ Présences orphelines: ${orphanPresences}`)
        }
        console.log(`   - Taux présence: ${fairPresenceRate.toFixed(1)}%`)
        console.log(`   - Score final: ${finalScore.toFixed(1)}%`)
      }
      
      return {
        id: crypto.randomUUID(),
        student_id: student.id,
        final_score: Math.round(finalScore),
        attendance_score: Math.round(fairPresenceRate),
        quiz_score: Math.round(fairQuizScore),
        total_quizzes_expected: relevantQuizzes.length,
        completed_quizzes: validCompletedCount,
        missed_quizzes: relevantQuizzes.length - validCompletedCount,
        total_sessions_expected: totalSessions,
        present_sessions: presenceCount,
        missed_sessions: totalSessions - presenceCount,
        orphan_presences: orphanPresences,
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

    // Appliquer les filtres
    let filteredRankings = rankings
    if (serviceFilter && serviceFilter !== 'all') {
      filteredRankings = filteredRankings.filter(r => r.student.service_id === serviceFilter)
    }
    if (branchFilter && branchFilter !== 'all') {
      filteredRankings = filteredRankings.filter(r => r.student.branch === branchFilter)
    }

    // Trier et ajouter les rangs
    filteredRankings.sort((a, b) => b.final_score - a.final_score)
    const rankingsWithRank = filteredRankings.map((r, index) => ({ ...r, rank: index + 1 }))

    // Statistiques
    const stats = {
      totalStudents: rankingsWithRank.length,
      averageScore: rankingsWithRank.length > 0 
        ? Math.round(rankingsWithRank.reduce((acc, r) => acc + r.final_score, 0) / rankingsWithRank.length)
        : 0,
      totalStudentsWithMissedQuizzes: rankingsWithRank.filter(r => r.missed_quizzes > 0).length,
      totalStudentsWithMissedSessions: rankingsWithRank.filter(r => r.missed_sessions > 0).length,
      totalOrphanPresences: rankingsWithRank.reduce((acc, r) => acc + (r.orphan_presences || 0), 0)
    }

    console.log('\n🔵 [FAIR API] ========== RÉSUMÉ ==========')
    console.log(`📊 Total étudiants classés: ${rankingsWithRank.length}`)
    console.log(`📊 Présences orphelines totales: ${stats.totalOrphanPresences}`)
    if (rankingsWithRank.length > 0) {
      console.log(`🏆 Top 3:`)
      rankingsWithRank.slice(0, 3).forEach(r => {
        console.log(`   ${r.rank}. ${r.student.full_name} - ${r.final_score}%`)
      })
    }
    console.log(`📊 Stats globales:`, stats)
    console.log('🔵 [FAIR API] ========== FIN ==========\n')

    return NextResponse.json({
      rankings: rankingsWithRank,
      stats,
      isFair: true
    })
  } catch (error) {
    console.error('❌ [FAIR API] Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
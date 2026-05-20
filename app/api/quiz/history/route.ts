import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const user = verifyToken(token)
    if (!user || (user.role !== 'superadmin' && user.role !== 'service_manager')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const quizId = searchParams.get('quizId')
    const serviceId = searchParams.get('serviceId')
    const level = searchParams.get('level')
    const branch = searchParams.get('branch')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')

    let query = supabase
      .from('quiz_results')
      .select(`
        *,
        student:students!inner(id, full_name, username, branch, level, service_id),
        quiz:quizzes!inner(id, title, level)
      `, { count: 'exact' })
      .order('submitted_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtres
    if (studentId) query = query.eq('student_id', studentId)
    if (quizId) query = query.eq('quiz_id', quizId)
    if (level && level !== 'all') query = query.eq('quiz.level', parseInt(level))
    
    // Filtrer par service si manager
    if (user.role === 'service_manager') {
      query = query.eq('student.service_id', user.serviceId)
    } else if (serviceId && serviceId !== 'all') {
      query = query.eq('student.service_id', serviceId)
    }

    if (branch && branch !== 'all') query = query.eq('student.branch', branch)
    if (startDate) query = query.gte('submitted_at', startDate)
    if (endDate) query = query.lte('submitted_at', endDate + 'T23:59:59')

    const { data: results, error, count } = await query

    if (error) {
      console.error('Erreur historique quiz:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Statistiques
    const { data: allResults } = await supabase
      .from('quiz_results')
      .select('percentage')

    const totalQuizzes = allResults?.length || 0
    const averageScore = allResults?.length
      ? Math.round(allResults.reduce((acc, r) => acc + (r.percentage || 0), 0) / allResults.length)
      : 0
    const perfectScores = allResults?.filter(r => r.percentage === 100).length || 0

    // Top étudiants
    const { data: topStudents } = await supabase
      .from('quiz_results')
      .select(`
        student_id,
        student:students(full_name),
        percentage
      `)
      .order('percentage', { ascending: false })
      .limit(10)

    // Quiz les plus échoués
    const { data: hardestQuizzes } = await supabase
      .from('quiz_results')
      .select(`
        quiz_id,
        quiz:quizzes(title),
        percentage
      `)
      .order('percentage', { ascending: true })
      .limit(5)

    return NextResponse.json({
      results,
      total: count || 0,
      stats: {
        totalQuizzes,
        averageScore,
        perfectScores,
        totalStudents: new Set(results?.map(r => r.student_id)).size
      },
      topStudents,
      hardestQuizzes
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
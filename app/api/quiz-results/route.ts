import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

// GET - Récupérer les résultats des quiz (superadmin uniquement)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // Seul le superadmin peut voir tous les résultats
    if (user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const quizId = searchParams.get('quizId')
    const level = searchParams.get('level')
    const studentId = searchParams.get('studentId')

    let query = supabase
      .from('quiz_results')
      .select(`
        *,
        student:students(id, full_name, username, level, branch),
        quiz:quizzes(id, title, level)
      `)
      .order('submitted_at', { ascending: false })

    if (quizId && quizId !== 'all') {
      query = query.eq('quiz_id', quizId)
    }

    if (level && level !== 'all') {
      query = query.eq('quiz.level', parseInt(level))
    }

    if (studentId && studentId !== 'all') {
      query = query.eq('student_id', studentId)
    }

    const { data: results, error } = await query

    if (error) {
      console.error('Erreur récupération résultats:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Statistiques globales
    const totalStudents = new Set(results?.map(r => r.student_id)).size
    const averageScore = results?.length 
      ? results.reduce((acc, r) => acc + r.percentage, 0) / results.length 
      : 0

    return NextResponse.json({
      results,
      stats: {
        totalSubmissions: results?.length || 0,
        totalStudents,
        averageScore: Math.round(averageScore),
        perfectScores: results?.filter(r => r.percentage === 100).length || 0
      }
    })
  } catch (error) {
    console.error('Erreur GET quiz-results:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
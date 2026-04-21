import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

// GET - Récupérer les résultats de l'étudiant connecté
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const quizId = searchParams.get('quizId')

    let query = supabase
      .from('quiz_results')
      .select(`
        *,
        quiz:quizzes(id, title, level, start_date, end_date)
      `)
      .eq('student_id', user.id)
      .order('submitted_at', { ascending: false })

    if (quizId) {
      query = query.eq('quiz_id', quizId)
    }

    const { data: results, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Statistiques personnelles
    const totalQuizzes = results?.length || 0
    const averageScore = results?.length 
      ? results.reduce((acc, r) => acc + r.percentage, 0) / results.length 
      : 0
    const bestScore = results?.length 
      ? Math.max(...results.map(r => r.percentage)) 
      : 0

    return NextResponse.json({
      results,
      stats: {
        totalQuizzes,
        averageScore: Math.round(averageScore),
        bestScore
      }
    })
  } catch (error) {
    console.error('Erreur GET my-results:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
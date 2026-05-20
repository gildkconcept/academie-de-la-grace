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
    if (!user || user.role === 'student') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const resultId = searchParams.get('resultId')

    if (!resultId) return NextResponse.json({ error: 'resultId requis' }, { status: 400 })

    // Résultat du quiz
    const { data: result } = await supabase
      .from('quiz_results')
      .select('*, student:students(full_name, username), quiz:quizzes(title)')
      .eq('id', resultId)
      .single()

    // Réponses détaillées
    const { data: answers } = await supabase
      .from('quiz_answers')
      .select('*, question:questions(question, option_a, option_b, option_c, option_d, correct_answer)')
      .eq('student_id', result.student_id)
      .eq('quiz_id', result.quiz_id)
      .order('question_id')

    return NextResponse.json({ result, answers: answers || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
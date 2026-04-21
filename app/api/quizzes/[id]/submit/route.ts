import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: quizId } = await params
    const { answers } = await request.json() // answers: { questionId: selectedAnswer }

    // Récupérer les questions du quiz
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, correct_answer')
      .eq('quiz_id', quizId)

    if (questionsError || !questions) {
      return NextResponse.json({ error: 'Quiz non trouvé' }, { status: 404 })
    }

    let score = 0
    const answerRecords = []

    for (const question of questions) {
      const selectedAnswer = answers[question.id]
      const isCorrect = selectedAnswer === question.correct_answer
      if (isCorrect) score++

      answerRecords.push({
        student_id: user.id,
        quiz_id: quizId,
        question_id: question.id,
        selected_answer: selectedAnswer || null,
        is_correct: isCorrect
      })
    }

    // Supprimer les anciennes réponses
    await supabase
      .from('quiz_answers')
      .delete()
      .eq('student_id', user.id)
      .eq('quiz_id', quizId)

    // Insérer les nouvelles réponses
    const { error: insertError } = await supabase
      .from('quiz_answers')
      .insert(answerRecords)

    if (insertError) {
      console.error(insertError)
      return NextResponse.json({ error: 'Erreur sauvegarde' }, { status: 500 })
    }

    // Calculer et sauvegarder le résultat
    const totalQuestions = questions.length
    const percentage = (score / totalQuestions) * 100

    const { error: resultError } = await supabase
      .from('quiz_results')
      .upsert({
        student_id: user.id,
        quiz_id: quizId,
        score,
        total_questions: totalQuestions,
        percentage,
        submitted_at: new Date().toISOString()
      })

    if (resultError) {
      console.error(resultError)
    }

    // Vérifier si score parfait pour badge "Expert biblique"
    if (percentage === 100) {
      const { data: existingBadge } = await supabase
        .from('student_badges')
        .select('id')
        .eq('student_id', user.id)
        .eq('badge_id', 'perfect_quiz_badge') // À créer en base
        .single()

      if (!existingBadge) {
        await supabase.from('student_badges').insert({
          student_id: user.id,
          badge_id: 'perfect_quiz_badge',
          awarded_at: new Date().toISOString()
        })
      }
    }

    return NextResponse.json({
      success: true,
      score,
      totalQuestions,
      percentage
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
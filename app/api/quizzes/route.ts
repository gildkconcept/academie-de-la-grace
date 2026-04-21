import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

// GET - Récupérer les quizzes
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

    const { searchParams } = new URL(request.url)
    const quizId = searchParams.get('id')
    const level = searchParams.get('level')

    // Récupérer un quiz spécifique avec ses questions
    if (quizId) {
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single()

      if (quizError) {
        return NextResponse.json({ error: 'Quiz non trouvé' }, { status: 404 })
      }

      const { data: questions } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true })

      return NextResponse.json({ ...quiz, questions: questions || [] })
    }

    // Récupérer la liste des quizzes
    const today = new Date().toISOString().split('T')[0]
    
    let query = supabase
      .from('quizzes')
      .select('*')
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', { ascending: false })

    if (user.role === 'student' && level) {
      query = query.eq('level', parseInt(level))
    }

    const { data: quizzes, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Pour les étudiants, vérifier s'ils ont déjà répondu
    if (user.role === 'student') {
      const { data: results } = await supabase
        .from('quiz_results')
        .select('quiz_id, score, total_questions, percentage')
        .eq('student_id', user.id)

      const resultsMap = new Map(results?.map(r => [r.quiz_id, r]))

      const quizzesWithStatus = quizzes?.map(quiz => ({
        ...quiz,
        completed: resultsMap.has(quiz.id),
        result: resultsMap.get(quiz.id) || null
      }))

      return NextResponse.json(quizzesWithStatus)
    }

    return NextResponse.json(quizzes)
  } catch (error) {
    console.error('Erreur GET quizzes:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Créer un nouveau quiz (superadmin uniquement)
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé. Seul le superadmin peut créer des quiz.' }, { status: 403 })
    }

    const { title, description, level, start_date, end_date, questions } = await request.json()

    // Validation
    if (!title || !level || !start_date || !end_date || !questions || questions.length === 0) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    // Créer le quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert([{
        title,
        description: description || '',
        level: parseInt(level),
        start_date,
        end_date,
        created_by: user.id,
        is_active: true
      }])
      .select()
      .single()

    if (quizError) {
      console.error('Erreur création quiz:', quizError)
      return NextResponse.json({ error: 'Erreur lors de la création du quiz' }, { status: 500 })
    }

    // Ajouter les questions
    const questionsToInsert = questions.map((q: any, index: number) => ({
      quiz_id: quiz.id,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      order_index: index
    }))

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert)

    if (questionsError) {
      console.error('Erreur création questions:', questionsError)
      // Supprimer le quiz si les questions échouent
      await supabase.from('quizzes').delete().eq('id', quiz.id)
      return NextResponse.json({ error: 'Erreur lors de la création des questions' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Quiz créé avec succès',
      quizId: quiz.id 
    })
  } catch (error) {
    console.error('Erreur POST quiz:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
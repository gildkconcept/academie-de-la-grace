// app/api/quizzes/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET - Récupérer les quizzes
export async function GET(request: Request) {
  try {
    // ✅ Lire le token depuis le cookie
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const quizId = searchParams.get('id')

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
    console.log('📅 Aujourd\'hui (UTC):', today)
    
    // Requête de base : tous les quiz actifs
    let query = supabase
      .from('quizzes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // FILTRAGE PAR NIVEAU POUR LES ÉTUDIANTS
    if (user.role === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('level')
        .eq('id', user.id)
        .single()
      
      const studentLevel = student?.level || 1
      console.log('📚 ÉTUDIANT connecté - Niveau:', studentLevel)
      
      query = query.eq('level', studentLevel)
    }

    const { data: quizzes, error } = await query

    if (error) {
      console.error('Erreur requête quizzes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Pour les étudiants, vérifier s'ils ont déjà répondu et gérer les dates
    if (user.role === 'student') {
      // Récupérer les résultats déjà soumis par l'étudiant
      const { data: results } = await supabase
        .from('quiz_results')
        .select('quiz_id, score, total_questions, percentage, submitted_at')
        .eq('student_id', user.id)

      const resultsMap = new Map(results?.map(r => [r.quiz_id, r]))

      // Ajouter le statut à chaque quiz
      const quizzesWithStatus = quizzes?.map(quiz => {
        const isCompleted = resultsMap.has(quiz.id)
        const isActivePeriod = quiz.start_date <= today && quiz.end_date >= today
        const isUpcoming = quiz.start_date > today
        
        return {
          ...quiz,
          completed: isCompleted,
          is_active_period: isActivePeriod,
          is_upcoming: isUpcoming,
          // Un quiz expiré non complété ne doit plus être accessible
          can_take: !isCompleted && isActivePeriod,
          result: resultsMap.get(quiz.id) || null
        }
      }) || []

      // Filtrer : on garde les quiz actifs (non expirés) + les quiz complétés (pour l'historique)
      // Mais on ne montre pas les quiz expirés non complétés
      const filteredQuizzes = quizzesWithStatus.filter(quiz => {
        // Garder tous les quiz complétés (pour l'historique)
        if (quiz.completed) return true
        // Garder les quiz actifs
        if (quiz.is_active_period) return true
        // Exclure les quiz expirés non complétés
        return false
      })

      console.log('📊 Quiz retournés:', filteredQuizzes.map(q => ({ 
        title: q.title, 
        completed: q.completed, 
        is_active_period: q.is_active_period 
      })))

      return NextResponse.json(filteredQuizzes)
    }

    // Pour les admins, retourner tous les quiz
    return NextResponse.json(quizzes || [])
  } catch (error) {
    console.error('Erreur GET quizzes:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Créer un nouveau quiz (superadmin uniquement)
export async function POST(request: Request) {
  try {
    // ✅ Lire le token depuis le cookie
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé. Seul le superadmin peut créer des quiz.' }, { status: 403 })
    }

    const { title, description, level, start_date, end_date, questions } = await request.json()

    if (!title || !level || !start_date || !end_date || !questions || questions.length === 0) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    // Vérifier que la date de fin est postérieure à la date de début
    if (end_date < start_date) {
      return NextResponse.json({ error: 'La date de fin doit être postérieure à la date de début' }, { status: 400 })
    }

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
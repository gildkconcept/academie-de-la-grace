// app/api/admin/quiz-manual/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET - Récupérer les étudiants sans téléphone et les quiz
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
    const studentId = searchParams.get('studentId')

    // Récupérer les étudiants sans téléphone
    const { data: students } = await supabase
      .from('students')
      .select('id, full_name, username, level, service_id, phone, has_phone, maison_grace')
      .eq('has_phone', false)
      .is('deleted_at', null)
      .order('full_name')

    // Récupérer les quiz actifs
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id, title, level, start_date, end_date')
      .eq('is_active', true)
      .order('level', { ascending: true })

    // Si un étudiant est sélectionné, récupérer ses notes manuelles
    let manualNotes = []
    if (studentId) {
      const { data: notes } = await supabase
        .from('quiz_results')
        .select(`
          *,
          quiz:quizzes(id, title, level),
          admin:users(id, name)
        `)
        .eq('student_id', studentId)
        .eq('entry_method', 'manual_admin')
      
      manualNotes = notes || []
    }

    return NextResponse.json({
      students,
      quizzes,
      manualNotes
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Ajouter/modifier une note manuelle
export async function POST(request: Request) {
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

    const { studentId, quizId, score, totalQuestions, percentage, action } = await request.json()

    if (!studentId || !quizId) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    // Vérifier si un résultat existe déjà
    const { data: existing } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('student_id', studentId)
      .eq('quiz_id', quizId)
      .maybeSingle()

    let result

    if (existing && action === 'delete') {
      // Supprimer la note
      // Journaliser la suppression
      await supabase
        .from('quiz_audit_log')
        .insert({
          quiz_result_id: existing.id,
          student_id: studentId,
          quiz_id: quizId,
          old_score: existing.score,
          old_percentage: existing.percentage,
          action_type: 'DELETE',
          changed_by: user.id,
          reason: 'Suppression manuelle par admin'
        })

      // Supprimer
      const { error } = await supabase
        .from('quiz_results')
        .delete()
        .eq('id', existing.id)

      if (error) throw error

      result = { deleted: true }
    } else {
      // Vérifier que le quiz existe
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('total_questions')
        .eq('id', quizId)
        .single()

      const finalPercentage = percentage || (score / (totalQuestions || quiz?.total_questions || 10)) * 100

      // Upsert la note
      const { data, error } = await supabase
        .from('quiz_results')
        .upsert({
          student_id: studentId,
          quiz_id: quizId,
          score: score || 0,
          total_questions: totalQuestions || quiz?.total_questions || 10,
          percentage: finalPercentage,
          submitted_at: new Date().toISOString(),
          entry_method: 'manual_admin',
          entered_by: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'student_id,quiz_id'
        })
        .select()
        .single()

      if (error) throw error
      result = data

      // Journaliser l'action
      await supabase
        .from('quiz_audit_log')
        .insert({
          quiz_result_id: result.id,
          student_id: studentId,
          quiz_id: quizId,
          old_score: existing?.score,
          new_score: result.score,
          old_percentage: existing?.percentage,
          new_percentage: result.percentage,
          action_type: existing ? 'UPDATE' : 'MANUAL_ENTRY',
          changed_by: user.id,
          reason: existing ? 'Modification manuelle par admin' : 'Ajout manuel par admin'
        })
    }

    // Recalculer le classement équitable
    await supabase.rpc('calculate_fair_ranking')

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
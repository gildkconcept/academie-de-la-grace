import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const currentUser = verifyToken(token)
    if (!currentUser) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    const { id: studentId } = await params
    const { level } = await request.json()

    // Validation du niveau
    const newLevel = parseInt(level)
    if (isNaN(newLevel) || newLevel < 1 || newLevel > 3) {
      return NextResponse.json(
        { error: 'Le niveau doit être 1, 2 ou 3' },
        { status: 400 }
      )
    }

    // Récupérer l'étudiant
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('id, service_id, level')
      .eq('id', studentId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !student) {
      return NextResponse.json(
        { error: 'Étudiant non trouvé' },
        { status: 404 }
      )
    }

    // Vérification des droits
    if (currentUser.role === 'superadmin') {
      // Superadmin peut tout modifier
    } else if (currentUser.role === 'service_manager') {
      // Le responsable ne peut modifier que les étudiants de son service
      if (student.service_id !== currentUser.serviceId) {
        return NextResponse.json(
          { error: 'Accès refusé : vous ne pouvez modifier que les étudiants de votre service' },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Accès refusé : droits insuffisants' },
        { status: 403 }
      )
    }

    const oldLevel = student.level

    // Si le niveau n'a pas changé, ne rien faire
    if (oldLevel === newLevel) {
      return NextResponse.json({
        success: true,
        message: 'Le niveau est déjà à cette valeur'
      })
    }

    // Mettre à jour le niveau
    const { error: updateError } = await supabase
      .from('students')
      .update({ level: newLevel })
      .eq('id', studentId)

    if (updateError) {
      console.error(updateError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du niveau' },
        { status: 500 }
      )
    }

    // Enregistrer l'historique
    const { error: historyError } = await supabase
      .from('student_level_history')
      .insert({
        student_id: studentId,
        old_level: oldLevel,
        new_level: newLevel,
        changed_by: currentUser.id
      })

    if (historyError) {
      console.error('Erreur historique:', historyError)
      // Ne pas bloquer la réponse, juste logger
    }

    return NextResponse.json({
      success: true,
      message: `Niveau changé de ${oldLevel} à ${newLevel}`,
      oldLevel,
      newLevel
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
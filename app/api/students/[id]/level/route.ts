import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { createNotification } from '@/lib/notifications'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Lire le token depuis le cookie
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const currentUser = verifyToken(token)
    if (!currentUser) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    const { id: studentId } = await params
    const { level, reason } = await request.json()

    // Validation du niveau
    const newLevel = parseInt(level)
    if (isNaN(newLevel) || newLevel < 1 || newLevel > 3) {
      return NextResponse.json(
        { error: 'Le niveau doit être 1, 2 ou 3' },
        { status: 400 }
      )
    }

    // ✅ Vérifier que seul le superadmin peut modifier les niveaux
    if (currentUser.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Accès refusé. Seul le Super Admin peut modifier les niveaux.' },
        { status: 403 }
      )
    }

    // Récupérer l'étudiant avec plus d'informations
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('id, service_id, level, full_name, email')
      .eq('id', studentId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !student) {
      return NextResponse.json(
        { error: 'Étudiant non trouvé' },
        { status: 404 }
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

    // Mettre à jour le niveau avec la date de mise à jour
    const { error: updateError } = await supabase
      .from('students')
      .update({ 
        level: newLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId)

    if (updateError) {
      console.error(updateError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du niveau' },
        { status: 500 }
      )
    }

    // ✅ Enregistrer l'historique avec la raison
    const { error: historyError } = await supabase
      .from('student_level_history')
      .insert({
        student_id: studentId,
        old_level: oldLevel,
        new_level: newLevel,
        changed_by: currentUser.id,
        reason: reason || `Promotion manuelle par ${currentUser.name || currentUser.username}`
      })

    if (historyError) {
      console.error('Erreur historique:', historyError)
    }

    // ✅ Envoyer une notification à l'étudiant
    const notificationResult = await createNotification({
      userIds: studentId,
      title: oldLevel < newLevel ? '🎉 Félicitations ! Promotion académique' : '📚 Changement de niveau académique',
      message: oldLevel < newLevel 
        ? `Félicitations ! Vous êtes passé(e) du Niveau ${oldLevel} au Niveau ${newLevel}. Continuez vos efforts !`
        : `Votre niveau a été ajusté du Niveau ${oldLevel} au Niveau ${newLevel}.`,
      type: 'promotion',
      link: '/dashboard/student'
    })

    // ✅ Recalculer le classement (optionnel - si la fonction existe)
    try {
      await supabase.rpc('calculate_fair_ranking')
    } catch (rpcError) {
      console.log('Note: calculate_fair_ranking non disponible, classement mis à jour au prochain calcul')
    }

    console.log(`✅ Niveau changé pour ${student.full_name}: ${oldLevel} → ${newLevel}`)
    if (notificationResult.created > 0) {
      console.log(`📧 Notification envoyée à l'étudiant`)
    }

    return NextResponse.json({
      success: true,
      message: `Niveau changé de ${oldLevel} à ${newLevel}`,
      oldLevel,
      newLevel,
      studentName: student.full_name,
      notificationSent: notificationResult.created > 0
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
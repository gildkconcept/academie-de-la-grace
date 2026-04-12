import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function DELETE(
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

    // Récupérer l'étudiant (non déjà supprimé)
    const { data: student, error: fetchError } = await supabase
      .from('students')
      .select('id, service_id, deleted_at')
      .eq('id', studentId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !student) {
      return NextResponse.json({ error: 'Étudiant non trouvé ou déjà supprimé' }, { status: 404 })
    }

    // Vérification des droits
    if (currentUser.role === 'superadmin') {
      // Superadmin peut supprimer tout étudiant
    } else if (currentUser.role === 'service_manager') {
      // Le responsable ne peut supprimer que les étudiants de son service
      if (student.service_id !== currentUser.serviceId) {
        return NextResponse.json(
          { error: 'Accès refusé : vous ne pouvez supprimer que les étudiants de votre service' },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Accès refusé : droits insuffisants' },
        { status: 403 }
      )
    }

    // Suppression logique
    const { error: updateError } = await supabase
      .from('students')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', studentId)

    if (updateError) {
      console.error(updateError)
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Étudiant supprimé avec succès' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
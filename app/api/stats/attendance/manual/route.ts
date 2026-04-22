import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user || (user.role !== 'service_manager' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { sessionId, attendances } = await request.json()

    if (!sessionId || !attendances) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    // Vérifier la session
    const { data: session, error: sessionError } = await supabase
      .from('service_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 })
    }

    // Vérifier les droits (manager ou superadmin)
    if (user.role === 'service_manager' && session.service_id !== user.serviceId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Préparer les enregistrements
    const records = attendances.map((a: any) => ({
      student_id: a.studentId,
      service_session_id: sessionId,
      status: a.status,
      method: 'manual',
      marked_by: user.id
    }))

    const { error: insertError } = await supabase
      .from('service_attendance')
      .upsert(records, { onConflict: 'student_id,service_session_id' })

    if (insertError) {
      console.error('Erreur enregistrement:', insertError)
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Présences enregistrées avec succès'
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
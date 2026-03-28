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
    
    if (!user || user.role !== 'service_manager') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { date } = await request.json()
    const sessionDate = date || new Date().toISOString().split('T')[0]

    // Créer une nouvelle session
    const { data: session, error } = await supabase
      .from('service_sessions')
      .insert([
        {
          service_id: user.serviceId,
          date: sessionDate,
          created_by: user.id
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Erreur création session:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la création de la session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      session: session,
      message: 'Session démarrée'
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
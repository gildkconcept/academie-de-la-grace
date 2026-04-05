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

    const { date, type } = await request.json()
    if (!type) {
      return NextResponse.json({ error: 'Le type de session est obligatoire' }, { status: 400 })
    }

    // Vérifier que le type existe
    const { data: typeExists } = await supabase
      .from('session_types')
      .select('code')
      .eq('code', type)
      .single()
    if (!typeExists) {
      return NextResponse.json({ error: 'Type de session invalide' }, { status: 400 })
    }

    const sessionDate = date || new Date().toISOString().split('T')[0]

    const { data: session, error } = await supabase
      .from('service_sessions')
      .insert([
        {
          service_id: user.serviceId,
          date: sessionDate,
          type: type,
          created_by: user.id
        }
      ])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, sessionId: session.id, session })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
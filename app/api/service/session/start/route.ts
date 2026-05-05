import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'service_manager') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { date, type } = await request.json()
    if (!type) {
      return NextResponse.json({ error: 'Le type de session est obligatoire' }, { status: 400 })
    }

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
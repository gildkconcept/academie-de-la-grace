// app/api/live/heartbeat/route.ts - Version corrigée
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
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { currentPage } = await request.json()

    // Vérifier si l'utilisateur existe déjà
    const { data: existing } = await supabase
      .from('online_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    // Préparer les données
    const upsertData = {
      user_id: user.id,
      user_name: user.name,
      user_role: user.role,
      last_seen: new Date().toISOString(),
      is_online: true,
      current_page: currentPage || null
    }

    let result
    if (existing) {
      // Update si existe
      result = await supabase
        .from('online_users')
        .update(upsertData)
        .eq('user_id', user.id)
        .select()
        .single()
    } else {
      // Insert si n'existe pas
      result = await supabase
        .from('online_users')
        .insert(upsertData)
        .select()
        .single()
    }

    if (result.error) {
      console.error('Erreur heartbeat:', result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: result.data })
    
  } catch (error) {
    console.error('Erreur heartbeat:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
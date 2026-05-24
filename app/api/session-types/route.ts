// app/api/session-types/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    // ✅ Lire le token depuis le cookie (méthode standard)
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer les types de sessions
    const { data, error } = await supabase
      .from('session_types')
      .select('*')
      .order('code')

    if (error) {
      console.error('Erreur Supabase:', error)
      return NextResponse.json({ error: 'Erreur lors de la récupération des types' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Erreur session-types:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
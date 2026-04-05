import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('session_types')
      .select('*')
      .order('code')

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur session-types:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { groupId } = await request.json()
    if (!groupId) return NextResponse.json({ error: 'groupId requis' }, { status: 400 })

    const userType = user.role === 'student' ? 'student' : 'user'

    const { error } = await supabase
      .from('chat_group_members')
      .upsert({
        group_id: groupId,
        user_id: user.id,
        user_type: userType
      }, { onConflict: 'group_id,user_id,user_type' })

    if (error) return NextResponse.json({ error: 'Erreur' }, { status: 500 })

    return NextResponse.json({ success: true, message: 'Groupe rejoint' })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
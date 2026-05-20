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

    const { messageId, reason } = await request.json()
    if (!messageId) return NextResponse.json({ error: 'messageId requis' }, { status: 400 })

    const { error } = await supabase
      .from('chat_reports')
      .insert([{
        message_id: messageId,
        reported_by: user.id,
        reason: reason || ''
      }])

    if (error) return NextResponse.json({ error: 'Erreur' }, { status: 500 })

    return NextResponse.json({ success: true, message: 'Message signalé' })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
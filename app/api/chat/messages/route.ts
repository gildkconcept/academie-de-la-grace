import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET - Récupérer les messages d'un groupe
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const before = searchParams.get('before') // Pour la pagination

    if (!groupId) return NextResponse.json({ error: 'groupId requis' }, { status: 400 })

    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data: messages } = await query

    // Marquer comme lu
    if (messages && messages.length > 0) {
      const reads = messages.map(msg => ({
        message_id: msg.id,
        user_id: user.id,
        user_type: user.role === 'student' ? 'student' : 'user'
      }))
      
      await supabase.from('chat_message_reads').upsert(reads, { onConflict: 'message_id,user_id,user_type' })
    }

    return NextResponse.json({ messages: messages?.reverse() || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Envoyer un message
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { groupId, content, type = 'text', replyTo } = await request.json()
    if (!groupId || !content) return NextResponse.json({ error: 'groupId et content requis' }, { status: 400 })

    const senderName = user.name || user.username
    const senderType = user.role === 'student' ? 'student' : 'user'

    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert([{
        group_id: groupId,
        sender_id: user.id,
        sender_type: senderType,
        sender_name: senderName,
        content,
        type,
        reply_to: replyTo || null
      }])
      .select()
      .single()

   if (error) {
  console.error('❌ Chat message error:', error)
  return NextResponse.json({ error: 'Erreur envoi message', details: error.message }, { status: 500 })
}
    return NextResponse.json({ message })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
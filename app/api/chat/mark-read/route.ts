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

    const { groupId } = await request.json()
    
    if (!groupId) {
      return NextResponse.json({ error: 'groupId requis' }, { status: 400 })
    }

    const userType = user.role === 'student' ? 'student' : 'user'

    // Récupérer TOUS les messages du groupe
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('group_id', groupId)
      .eq('is_deleted', false)

    if (messages && messages.length > 0) {
      // Pour chaque message, créer une entrée de lecture
      for (const msg of messages) {
        await supabase
          .from('chat_message_reads')
          .upsert({
            message_id: msg.id,
            user_id: user.id,
            user_type: userType
          }, { onConflict: 'message_id,user_id,user_type' })
      }
    }

    return NextResponse.json({ success: true, markedCount: messages?.length || 0 })
  } catch (error) {
    console.error('Erreur mark-read:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
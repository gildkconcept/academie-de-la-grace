import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET - Récupérer les messages d'un groupe (avec messages cités)
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
    const before = searchParams.get('before')

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

    // Charger les messages cités (reply_to)
    const replyToIds = messages?.filter(m => m.reply_to && !m.is_deleted).map(m => m.reply_to) || []
    const uniqueReplyIds = [...new Set(replyToIds)]
    
    let replyMessages: any[] = []
    if (uniqueReplyIds.length > 0) {
      const { data: replies } = await supabase
        .from('chat_messages')
        .select('id, sender_name, content, sender_id, sender_type, is_deleted')
        .in('id', uniqueReplyIds)
      
      replyMessages = replies || []
    }

    // Associer les messages cités
    const messagesWithReplies = messages?.map(msg => ({
      ...msg,
      reply_to_message: replyMessages.find(r => r.id === msg.reply_to) || null
    })) || []

    // Marquer comme lu
    if (messages && messages.length > 0) {
      const reads = messages.map(msg => ({
        message_id: msg.id,
        user_id: user.id,
        user_type: user.role === 'student' ? 'student' : 'user'
      }))
      
      await supabase.from('chat_message_reads').upsert(reads, { onConflict: 'message_id,user_id,user_type' })
    }

    return NextResponse.json({ messages: messagesWithReplies?.reverse() || [] })
  } catch (error) {
    console.error('Erreur GET chat:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Envoyer un message (avec réponse)
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

    // Si c'est une réponse, récupérer le message original
    let fullMessage = { ...message }
    if (replyTo) {
      const { data: originalMessage } = await supabase
        .from('chat_messages')
        .select('id, sender_name, content, sender_id, sender_type, is_deleted')
        .eq('id', replyTo)
        .single()
      
      if (originalMessage) {
        fullMessage.reply_to_message = originalMessage
      }
    }

    return NextResponse.json({ message: fullMessage })
  } catch (error) {
    console.error('Erreur POST chat:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT - Modifier un message
export async function PUT(request: Request) {
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

    const { messageId, content } = await request.json()
    
    if (!messageId || !content) {
      return NextResponse.json({ error: 'messageId et content requis' }, { status: 400 })
    }

    // Vérifier que l'utilisateur est l'auteur du message
    const { data: message, error: findError } = await supabase
      .from('chat_messages')
      .select('sender_id, sender_type')
      .eq('id', messageId)
      .single()

    if (findError || !message) {
      return NextResponse.json({ error: 'Message non trouvé' }, { status: 404 })
    }

    const userType = user.role === 'student' ? 'student' : 'user'
    const isAuthor = message.sender_id === user.id && message.sender_type === userType

    if (!isAuthor) {
      return NextResponse.json({ error: 'Vous ne pouvez modifier que vos propres messages' }, { status: 403 })
    }

    // Mettre à jour le message
    const { data: updatedMessage, error: updateError } = await supabase
      .from('chat_messages')
      .update({ 
        content, 
        is_edited: true, 
        edited_at: new Date().toISOString() 
      })
      .eq('id', messageId)
      .select()
      .single()

    if (updateError) {
      console.error('Erreur modification:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 })
    }

    return NextResponse.json({ message: updatedMessage })
  } catch (error) {
    console.error('Erreur PUT chat:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer un message (soft delete)
export async function DELETE(request: Request) {
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

    const { messageId } = await request.json()
    
    if (!messageId) {
      return NextResponse.json({ error: 'messageId requis' }, { status: 400 })
    }

    // Vérifier que l'utilisateur est l'auteur du message
    const { data: message, error: findError } = await supabase
      .from('chat_messages')
      .select('sender_id, sender_type, group_id')
      .eq('id', messageId)
      .single()

    if (findError || !message) {
      return NextResponse.json({ error: 'Message non trouvé' }, { status: 404 })
    }

    const userType = user.role === 'student' ? 'student' : 'user'
    const isAuthor = message.sender_id === user.id && message.sender_type === userType

    if (!isAuthor) {
      return NextResponse.json({ error: 'Vous ne pouvez supprimer que vos propres messages' }, { status: 403 })
    }

    // Soft delete : marquer comme supprimé
    const { error: updateError } = await supabase
      .from('chat_messages')
      .update({ 
        is_deleted: true, 
        content: null,
        deleted_at: new Date().toISOString()
      })
      .eq('id', messageId)

    if (updateError) {
      console.error('Erreur suppression:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Message supprimé' })
  } catch (error) {
    console.error('Erreur DELETE chat:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
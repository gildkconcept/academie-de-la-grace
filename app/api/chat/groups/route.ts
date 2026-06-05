// app/api/chat/groups/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
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

    console.log('👤 Utilisateur connecté:', { id: user.id, role: user.role, serviceId: user.serviceId })

    // Récupérer les infos de l'étudiant si c'est un étudiant
    let studentBranch: string | null = null
    let studentLevel: number | null = null
    let studentServiceId: string | null = null

    if (user.role === 'student') {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('branch, level, service_id')
        .eq('id', user.id)
        .single()
      
      if (studentError) {
        console.error('Erreur récupération étudiant:', studentError)
      } else if (student) {
        studentBranch = student.branch
        studentLevel = student.level
        studentServiceId = student.service_id
        console.log('📚 Étudiant:', { branch: studentBranch, level: studentLevel, serviceId: studentServiceId })
      }
    }

    // Récupérer TOUS les groupes actifs
    const { data: allGroups, error: groupsError } = await supabase
      .from('chat_groups')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (groupsError) {
      console.error('Erreur récupération groupes:', groupsError)
      return NextResponse.json({ error: groupsError.message }, { status: 500 })
    }

    console.log('📋 Tous les groupes:', allGroups?.length || 0)

    if (!allGroups || allGroups.length === 0) {
      return NextResponse.json({ groups: [] })
    }

    // Filtrer les groupes accessibles selon le rôle
    let accessibleGroups = allGroups

    if (user.role === 'student') {
      accessibleGroups = allGroups.filter(group => {
        // Groupe de type branche
        if (group.type === 'branch') {
          return group.branch === studentBranch
        }
        // Groupe de type niveau
        if (group.type === 'level') {
          return group.level === studentLevel
        }
        // Groupe de type service
        if (group.type === 'service') {
          return group.service_id === studentServiceId
        }
        // Groupe spécial (admin seulement)
        if (group.type === 'special') {
          return false
        }
        return false
      })
    } else if (user.role === 'service_manager') {
      accessibleGroups = allGroups.filter(group => {
        if (group.type === 'service') {
          return group.service_id === user.serviceId
        }
        return false
      })
    }
    // superadmin voit tous les groupes

    console.log('✅ Groupes accessibles:', accessibleGroups.length)

    const userType = user.role === 'student' ? 'student' : 'user'

    // Pour chaque groupe, compter les membres et les messages non lus
    const groupsWithInfo = await Promise.all(accessibleGroups.map(async (group) => {
      // Compter les membres
      const { count: memberCount, error: memberError } = await supabase
        .from('chat_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id)

      if (memberError) {
        console.error('Erreur comptage membres:', memberError)
      }

      // Dernier message
      const { data: lastMessage, error: lastMessageError } = await supabase
        .from('chat_messages')
        .select('content, sender_name, created_at, sender_id, sender_type')
        .eq('group_id', group.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastMessageError) {
        console.error('Erreur dernier message:', lastMessageError)
      }

      // Récupérer TOUS les IDs des messages du groupe
      const { data: allMessages, error: allMessagesError } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('group_id', group.id)
        .eq('is_deleted', false)

      if (allMessagesError) {
        console.error('Erreur récupération messages:', allMessagesError)
      }

      // Récupérer les messages que l'utilisateur a lus
      const { data: readMessages, error: readError } = await supabase
        .from('chat_message_reads')
        .select('message_id')
        .eq('user_id', user.id)
        .eq('user_type', userType)

      if (readError) {
        console.error('Erreur récupération lectures:', readError)
      }

      const readIds = new Set(readMessages?.map(r => r.message_id) || [])
      
      // Compter les messages non lus
      const unreadCount = allMessages?.filter(m => !readIds.has(m.id)).length || 0

      return {
        ...group,
        memberCount: memberCount || 0,
        lastMessage: lastMessage ? {
          content: lastMessage.content?.substring(0, 50) || '📎 Fichier',
          senderName: lastMessage.sender_name,
          senderId: lastMessage.sender_id,
          senderType: lastMessage.sender_type,
          time: lastMessage.created_at
        } : null,
        unreadCount: unreadCount
      }
    }))

    return NextResponse.json({ groups: groupsWithInfo })
  } catch (error) {
    console.error('Erreur chat groups:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
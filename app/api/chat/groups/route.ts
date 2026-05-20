import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const user = verifyToken(token)
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    // Récupérer les infos de l'étudiant si c'est un étudiant
    let studentBranch: string | null = null
    let studentLevel: number | null = null
    let studentServiceId: string | null = null

    if (user.role === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('branch, level, service_id')
        .eq('id', user.id)
        .single()
      
      if (student) {
        studentBranch = student.branch
        studentLevel = student.level
        studentServiceId = student.service_id
      }
    }

    console.log('🔍 Chat groups - user:', { role: user.role, branch: studentBranch, level: studentLevel, serviceId: studentServiceId, userId: user.id })

    // Récupérer tous les groupes
    let query = supabase.from('chat_groups').select('*').eq('is_active', true).order('created_at', { ascending: false })

    const { data: groups } = await query

    console.log('🔍 Chat groups - all groups count:', groups?.length)
    console.log('🔍 Chat groups - all groups:', groups?.map(g => ({ id: g.id, name: g.name, type: g.type, branch: g.branch, level: g.level, service_id: g.service_id })))

    // Filtrer les groupes accessibles
    const accessibleGroups = groups?.filter(group => {
      if (user.role === 'superadmin') return true
      if (user.role === 'service_manager') {
        const match = group.type === 'service' && group.service_id === user.serviceId
        console.log('🔍 Manager filter:', { group: group.name, type: group.type, groupServiceId: group.service_id, userServiceId: user.serviceId, match })
        return match
      }
      if (user.role === 'student') {
        if (group.type === 'branch') return group.branch === studentBranch
        if (group.type === 'level') return group.level === studentLevel
        if (group.type === 'service') return group.service_id === studentServiceId
        if (group.type === 'special') return false
      }
      return false
    }) || []

    console.log('🔍 Chat groups - accessible count:', accessibleGroups.length)

    // Pour chaque groupe, compter les membres et les messages non lus
    const groupsWithInfo = await Promise.all(accessibleGroups.map(async (group) => {
      const { count: memberCount } = await supabase
        .from('chat_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id)

      const { data: lastMessage } = await supabase
        .from('chat_messages')
        .select('content, sender_name, created_at')
        .eq('group_id', group.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Compter les messages non lus
      const { data: readMessages } = await supabase
        .from('chat_message_reads')
        .select('message_id')
        .eq('user_id', user.id)
        .eq('user_type', user.role === 'student' ? 'student' : 'user')

      const readIds = new Set(readMessages?.map(r => r.message_id) || [])

      const { data: allMessages } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('group_id', group.id)
        .eq('is_deleted', false)

      const unreadCount = allMessages?.filter(m => !readIds.has(m.id)).length || 0

      return {
        ...group,
        memberCount: memberCount || 0,
        lastMessage: lastMessage ? {
          content: lastMessage.content?.substring(0, 50) || '📎 Fichier',
          senderName: lastMessage.sender_name,
          time: lastMessage.created_at
        } : null,
        unreadCount: unreadCount || 0
      }
    }))

    return NextResponse.json({ groups: groupsWithInfo })
  } catch (error) {
    console.error('Erreur chat groups:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
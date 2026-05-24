// app/api/live/online-users/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get('role') || 'all'
    const serviceFilter = searchParams.get('serviceId') || 'all'
    const levelFilter = searchParams.get('level') || 'all'
    const branchFilter = searchParams.get('branch') || 'all'
    const statusFilter = searchParams.get('status') || 'all'

    // Nettoyer les anciennes entrées (plus de 2 minutes sans heartbeat)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    await supabase
      .from('online_users')
      .update({ is_online: false })
      .lt('last_seen', twoMinutesAgo)
      .eq('is_online', true)

    // Récupérer les utilisateurs
    let query = supabase
      .from('online_users')
      .select('*')
      .order('is_online', { ascending: false })
      .order('last_seen', { ascending: false })

    if (roleFilter !== 'all') {
      query = query.eq('user_role', roleFilter)
    }
    if (serviceFilter !== 'all') {
      query = query.eq('service_id', serviceFilter)
    }
    if (levelFilter !== 'all') {
      query = query.eq('level', parseInt(levelFilter))
    }
    if (branchFilter !== 'all') {
      query = query.eq('branch', branchFilter)
    }
    if (statusFilter === 'online') {
      query = query.eq('is_online', true)
    } else if (statusFilter === 'offline') {
      query = query.eq('is_online', false)
    }

    const { data: onlineUsers, error } = await query

    if (error) {
      console.error('Erreur récupération:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculer les durées de connexion
    const usersWithDuration = onlineUsers?.map(u => ({
      ...u,
      connected_duration: u.is_online && u.connected_at
        ? formatDuration(new Date(u.connected_at))
        : null,
      last_seen_formatted: formatRelativeTime(new Date(u.last_seen))
    })) || []

    // Statistiques
    const stats = {
      totalOnline: usersWithDuration.filter(u => u.is_online).length,
      studentsOnline: usersWithDuration.filter(u => u.user_role === 'student' && u.is_online).length,
      managersOnline: usersWithDuration.filter(u => u.user_role === 'service_manager' && u.is_online).length,
      mostActiveService: getMostActiveService(usersWithDuration)
    }

    return NextResponse.json({
      users: usersWithDuration,
      stats,
      lastUpdate: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function formatDuration(startDate: Date): string {
  const diff = Date.now() - startDate.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (3600000)) / 60000)
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }
  return `${minutes}min`
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'à l\'instant'
  if (minutes < 60) return `il y a ${minutes} min`
  if (hours < 24) return `il y a ${hours} h`
  if (days === 1) return 'hier'
  return `il y a ${days} jours`
}

function getMostActiveService(users: any[]): string | null {
  const serviceCount = new Map<string, number>()
  users.forEach(u => {
    if (u.is_online && u.service_name) {
      serviceCount.set(u.service_name, (serviceCount.get(u.service_name) || 0) + 1)
    }
  })
  
  let mostActive = null
  let maxCount = 0
  for (const [service, count] of serviceCount) {
    if (count > maxCount) {
      maxCount = count
      mostActive = service
    }
  }
  return mostActive
}
// app/api/live/heartbeat/route.ts
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

    const { currentPage } = await request.json()

    // Récupérer les infos supplémentaires selon le rôle
    let profileImageUrl = null
    let serviceName = null
    let level = null
    let branch = null

    if (user.role === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('profile_image_url, level, branch, services(name)')
        .eq('id', user.id)
        .single()
      
      if (student) {
        profileImageUrl = student.profile_image_url
        level = student.level
        branch = student.branch
        serviceName = (student.services as any)?.name
      }
    } else {
      const { data: userData } = await supabase
        .from('users')
        .select('profile_image_url, services(name)')
        .eq('id', user.id)
        .single()
      
      if (userData) {
        profileImageUrl = userData.profile_image_url
        serviceName = (userData.services as any)?.name
      }
    }

    // Upsert dans online_users
    const { data, error } = await supabase
      .from('online_users')
      .upsert({
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
        profile_image_url: profileImageUrl,
        service_id: user.serviceId || null,
        service_name: serviceName,
        level: level,
        branch: branch,
        is_online: true,
        last_seen: new Date().toISOString(),
        current_page: currentPage || null
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur heartbeat:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Erreur heartbeat:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
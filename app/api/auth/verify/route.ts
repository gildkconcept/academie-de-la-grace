// app/api/auth/verify/route.ts
import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      const response = NextResponse.json({ error: 'Token invalide' }, { status: 401 })
      response.cookies.set('token', '', { maxAge: 0, path: '/' })
      return response
    }

    let userData = null
    
    if (decoded.role === 'superadmin' || decoded.role === 'service_manager') {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.id)
        .maybeSingle()
      userData = data
      
    } else if (decoded.role === 'student') {
      let { data } = await supabase
        .from('students')
        .select('id, full_name, username, service_id, level, email, phone, deleted_at, maison_grace, profile_image_url')
        .eq('id', decoded.id)
        .is('deleted_at', null)
        .maybeSingle()
      
      if (!data && decoded.username) {
        const { data: byUsername } = await supabase
          .from('students')
          .select('id, full_name, username, service_id, level, email, phone, deleted_at, maison_grace, profile_image_url')
          .eq('username', decoded.username)
          .is('deleted_at', null)
          .maybeSingle()
        data = byUsername
      }
      
      userData = data
      
      if (userData?.deleted_at) {
        return NextResponse.json(
          { error: 'Compte désactivé, contactez l\'administrateur' },
          { status: 403 }
        )
      }
    }

    if (!userData) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé ou compte désactivé' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      user: {
        id: userData.id,
        name: userData.full_name || decoded.name,
        username: userData.username,
        role: decoded.role,
        serviceId: userData.service_id || decoded.serviceId,
        email: userData?.email || '',
        phone: userData?.phone || '',
        level: userData?.level || (decoded.role === 'student' ? 1 : null),
        maisonGrace: userData?.maison_grace || null,
        profileImageUrl: userData?.profile_image_url || null
      }
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
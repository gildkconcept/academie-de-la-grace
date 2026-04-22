import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    console.log('🔍 Token décodé:', decoded)

    let userData = null
    
    if (decoded.role === 'superadmin' || decoded.role === 'service_manager') {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.id)
        .maybeSingle()
      userData = data
      console.log('👤 Utilisateur admin trouvé:', userData)
    } else if (decoded.role === 'student') {
      // Tentative 1 : Recherche par ID (ajout de maison_grace)
      let { data } = await supabase
        .from('students')
        .select('id, full_name, username, service_id, level, email, phone, deleted_at, maison_grace')
        .eq('id', decoded.id)
        .is('deleted_at', null)
        .maybeSingle()
      
      // Tentative 2 : Si non trouvé par ID, rechercher par username
      if (!data && decoded.username) {
        console.log('🔍 Étudiant non trouvé par ID, recherche par username:', decoded.username)
        const { data: byUsername } = await supabase
          .from('students')
          .select('id, full_name, username, service_id, level, email, phone, deleted_at, maison_grace')
          .eq('username', decoded.username)
          .is('deleted_at', null)
          .maybeSingle()
        data = byUsername
        if (data) {
          console.log('✅ Étudiant trouvé par username, ID réel:', data.id)
        }
      }
      
      userData = data
      console.log('👤 Étudiant trouvé:', userData)
      console.log('📊 Niveau dans la base:', userData?.level)
      console.log('🏠 Maison de grâce:', userData?.maison_grace || 'non spécifiée')
      
      if (userData?.deleted_at) {
        console.log('❌ Compte désactivé (soft-deleted)')
        return NextResponse.json(
          { error: 'Compte désactivé, contactez l\'administrateur' },
          { status: 403 }
        )
      }
    }

    // Si aucun utilisateur trouvé
    if (!userData) {
      console.log('❌ Aucun utilisateur trouvé pour ID:', decoded.id)
      return NextResponse.json(
        { error: 'Utilisateur non trouvé ou compte désactivé' },
        { status: 404 }
      )
    }

    // Retourner les données en utilisant les infos réelles de la base
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
        maisonGrace: userData?.maison_grace || null  // ← AJOUT
      }
    })
  } catch (error) {
    console.error('❌ Erreur verify:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
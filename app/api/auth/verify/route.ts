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

    // Récupérer les informations complètes de l'utilisateur depuis la base de données
    let userData = null
    
    if (decoded.role === 'superadmin' || decoded.role === 'service_manager') {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', decoded.id)
        .single()
      userData = data
    } else {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('id', decoded.id)
        .single()
      userData = data
    }

    return NextResponse.json({ 
      user: {
        id: decoded.id,
        name: decoded.name,
        username: decoded.username,
        role: decoded.role,
        serviceId: decoded.serviceId,
        email: userData?.email || '',
        phone: userData?.phone || ''
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
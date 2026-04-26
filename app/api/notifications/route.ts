// app/api/notifications/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

// GET - Lister les notifications de l'utilisateur connecté
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unread') === 'true'

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Erreur récupération notifications:', error)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    // Compter les non lues
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return NextResponse.json({
      notifications: data || [],
      total: count || 0,
      unreadCount: unreadCount || 0
    })

  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Créer une notification (admin/manager uniquement pour les annonces)
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Seuls superadmin et service_manager peuvent créer des annonces
    if (user.role !== 'superadmin' && user.role !== 'service_manager') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { userIds, title, message, type, link } = await request.json()

    if (!userIds || !title || !message || !type) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const userIdArray = Array.isArray(userIds) ? userIds : [userIds]

    // Vérifier que le type est valide
    const validTypes = ['session', 'seance', 'quiz', 'result', 'promotion', 'absence', 'announcement']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    // Créer les notifications
    const notifications = userIdArray.map((userId: string) => ({
      user_id: userId,
      title,
      message,
      type,
      link: link || null
    }))

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) {
      console.error('Erreur création notifications:', error)
      return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${data.length} notification(s) créée(s)`,
      notifications: data
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
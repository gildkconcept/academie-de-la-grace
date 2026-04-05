import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user || (user.role !== 'superadmin' && user.role !== 'service_manager')) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const serviceId = searchParams.get('serviceId')
    const type = searchParams.get('type') // 👈 récupération du type

    let query = supabase
      .from('service_sessions')
      .select(`
        *,
        session_types (code, label, day_of_week),
        service_attendance (
          *,
          students (
            id,
            full_name,
            branch,
            level,
            baptized,
            phone
          )
        )
      `)

    if (date) {
      query = query.eq('date', date)
    }

    if (serviceId && serviceId !== 'all') {
      query = query.eq('service_id', serviceId)
    } else if (user.role === 'service_manager') {
      query = query.eq('service_id', user.serviceId)
    }

    if (type && type !== 'all') {
      query = query.eq('type', type) // 👈 filtrage par type
    }

    const { data, error } = await query

    if (error) {
      console.error('Erreur récupération présences service:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des données' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { studentId, badgeId } = await request.json()
    if (!studentId || !badgeId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // Vérifier que le badge existe
    const { data: badge } = await supabase
      .from('badges')
      .select('id')
      .eq('id', badgeId)
      .single()
    if (!badge) {
      return NextResponse.json({ error: 'Badge inexistant' }, { status: 404 })
    }

    // Vérifier que l'étudiant n'a pas déjà ce badge
    const { data: existing } = await supabase
      .from('student_badges')
      .select('id')
      .eq('student_id', studentId)
      .eq('badge_id', badgeId)
      .single()
    if (existing) {
      return NextResponse.json({ error: 'Badge déjà attribué' }, { status: 400 })
    }

    const { error } = await supabase
      .from('student_badges')
      .insert([{ student_id: studentId, badge_id: badgeId, awarded_at: new Date().toISOString() }])

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Erreur attribution' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Badge attribué' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
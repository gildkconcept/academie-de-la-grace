// app/api/sessions/active/route.ts
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
    
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer le niveau de l'étudiant
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, level, full_name')
      .eq('id', user.id)
      .single()

    if (studentError || !student) {
      console.error('Erreur récupération étudiant:', studentError)
      return NextResponse.json({ error: 'Étudiant non trouvé' }, { status: 404 })
    }

    // Date UTC actuelle
    const maintenant = new Date()
    const nowUTC = Date.UTC(
      maintenant.getUTCFullYear(),
      maintenant.getUTCMonth(),
      maintenant.getUTCDate(),
      maintenant.getUTCHours(),
      maintenant.getUTCMinutes(),
      maintenant.getUTCSeconds(),
      maintenant.getUTCMilliseconds()
    )
    const nowISO = new Date(nowUTC).toISOString()

    // Récupérer les sessions actives pour l'étudiant
    // - Sessions universelles (level IS NULL)
    // - Sessions de son niveau (level = student.level)
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .or(`level.is.null,level.eq.${student.level}`)
      .gt('expires_at', nowISO)
      .order('created_at', { ascending: false })

    if (sessionsError) {
      console.error('Erreur récupération sessions:', sessionsError)
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }

    // Vérifier si l'étudiant a déjà marqué sa présence pour chaque session
    const sessionsWithStatus = await Promise.all((sessions || []).map(async (session) => {
      const { data: attendance } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', student.id)
        .eq('session_id', session.id)
        .maybeSingle()

      // Calculer le temps restant
      const expiresAt = new Date(session.expires_at)
      const timeLeftMs = expiresAt.getTime() - nowUTC
      const timeLeftMinutes = Math.max(0, Math.floor(timeLeftMs / 60000))
      const timeLeftSeconds = Math.max(0, Math.floor((timeLeftMs % 60000) / 1000))

      return {
        id: session.id,
        code: session.code,
        level: session.level,
        expires_at: session.expires_at,
        created_at: session.created_at,
        hasMarked: !!attendance,
        timeLeft: {
          minutes: timeLeftMinutes,
          seconds: timeLeftSeconds,
          totalMs: timeLeftMs
        },
        isUniversal: session.level === null,
        isExpired: timeLeftMs <= 0
      }
    }))

    return NextResponse.json({
      success: true,
      sessions: sessionsWithStatus,
      studentLevel: student.level,
      studentName: student.full_name
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
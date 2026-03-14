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
    
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { sessionId, token: qrToken } = await request.json()

    // Vérifier si la session existe et est valide
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('qr_token', qrToken)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'QR code invalide' },
        { status: 400 }
      )
    }

    // Vérifier si le QR code n'a pas expiré
    const now = new Date()
    const expiresAt = new Date(session.expires_at)
    
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'QR code expiré' },
        { status: 400 }
      )
    }

    // Vérifier si l'étudiant appartient au bon service
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('service_id')
      .eq('id', user.id)
      .single()

    if (studentError || student.service_id !== session.service_id) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas autorisé pour cette session' },
        { status: 403 }
      )
    }

    // Vérifier si l'étudiant a déjà scanné pour cette session
    const { data: existingAttendance } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', user.id)
      .eq('session_id', sessionId)
      .single()

    if (existingAttendance) {
      return NextResponse.json(
        { error: 'Présence déjà enregistrée' },
        { status: 400 }
      )
    }

    // Enregistrer la présence
    const today = new Date().toISOString().split('T')[0]
    const { error: attendanceError } = await supabase
      .from('attendance')
      .insert([
        {
          student_id: user.id,
          session_id: sessionId,
          status: 'present',
          date: today
        }
      ])

    if (attendanceError) {
      console.error('Erreur enregistrement présence:', attendanceError)
      return NextResponse.json(
        { error: 'Erreur lors de l\'enregistrement' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Présence enregistrée avec succès'
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

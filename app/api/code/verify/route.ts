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

    const { code } = await request.json()

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'Code invalide' }, { status: 400 })
    }

    console.log('🔬 VÉRIFICATION CODE:', code)

    // Vérifier si la session existe avec ce code
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', code)
      .maybeSingle()

    if (sessionError || !session) {
      console.log('❌ Code non trouvé')
      return NextResponse.json({ error: 'Code invalide' }, { status: 400 })
    }

    console.log('✅ Code trouvé, ID session:', session.id)

    // Vérifier l'expiration
    const maintenant = new Date()
    const expiresAt = new Date(session.expires_at)

    if (maintenant.getTime() > expiresAt.getTime()) {
      console.log('❌ Code expiré')
      return NextResponse.json({ error: 'Code expiré' }, { status: 400 })
    }

    console.log('✅ Code valide')

    // Vérifier si déjà enregistré
    const { data: existingAttendance } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', user.id)
      .eq('session_id', session.id)
      .maybeSingle()

    if (existingAttendance) {
      console.log('❌ Présence déjà enregistrée')
      return NextResponse.json({ error: 'Présence déjà enregistrée' }, { status: 400 })
    }

    // Enregistrer la présence avec la méthode 'code'
    const today = new Date().toISOString().split('T')[0]
    const { error: attendanceError } = await supabase
      .from('attendance')
      .insert([{
        student_id: user.id,
        session_id: session.id,
        status: 'present',
        date: today,
        scanned_at: new Date().toISOString(),
        method: 'code'  // ← AJOUT : indique que la présence a été validée par code
      }])

    if (attendanceError) {
      console.error('❌ Erreur enregistrement:', attendanceError)
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 })
    }

    console.log('✅ Présence enregistrée avec méthode "code"')
    return NextResponse.json({ success: true, message: 'Présence enregistrée avec succès' })
    
  } catch (error) {
    console.error('❌ Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
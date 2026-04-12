import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

// Fonction de calcul de distance Haversine (en mètres)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Rayon terrestre en mètres
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}

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

    const { code, lat, lng } = await request.json()

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'Code invalide' }, { status: 400 })
    }

    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { error: 'Position GPS requise pour valider la présence' },
        { status: 400 }
      )
    }

    console.log('🔬 VÉRIFICATION CODE:')
    console.log('Code reçu:', code)
    console.log('Position étudiant:', lat, lng)

    // Vérifier si la session existe avec ce code
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', code)
      .maybeSingle()

    if (sessionError || !session) {
      console.log('❌ Code non trouvé dans la base')
      return NextResponse.json(
        { error: 'Code invalide' },
        { status: 400 }
      )
    }

    console.log('✅ Code trouvé')
    console.log('Session ID:', session.id)
    console.log('Position superadmin:', session.lat, session.lng)
    console.log('Rayon autorisé:', session.radius, 'm')

    // Vérifier l'expiration
    const maintenant = new Date()
    const expiresAt = new Date(session.expires_at)
    if (maintenant.getTime() > expiresAt.getTime()) {
      console.log('❌ Code expiré')
      return NextResponse.json(
        { error: 'Code expiré' },
        { status: 400 }
      )
    }

    // Calculer la distance
    const distance = haversineDistance(
      session.lat, session.lng,
      lat, lng
    )
    console.log(`📏 Distance calculée: ${Math.round(distance)} m`)

    if (distance > session.radius) {
      console.log(`❌ Hors zone (${Math.round(distance)}m > ${session.radius}m)`)
      return NextResponse.json(
        { error: `Hors zone de présence (distance ${Math.round(distance)}m > ${session.radius}m)` },
        { status: 400 }
      )
    }

    // Vérifier si déjà enregistré pour cette session
    const { data: existingAttendance } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', user.id)
      .eq('session_id', session.id)
      .maybeSingle()

    if (existingAttendance) {
      console.log('❌ Présence déjà enregistrée')
      return NextResponse.json(
        { error: 'Présence déjà enregistrée' },
        { status: 400 }
      )
    }

    // Enregistrer la présence avec les coordonnées et la distance
    const today = new Date().toISOString().split('T')[0]
    const { error: attendanceError } = await supabase
      .from('attendance')
      .insert([{
        student_id: user.id,
        session_id: session.id,
        status: 'present',
        date: today,
        scanned_at: new Date().toISOString(),
        student_lat: lat,
        student_lng: lng,
        distance: Math.round(distance)
      }])

    if (attendanceError) {
      console.error('❌ Erreur enregistrement:', attendanceError)
      return NextResponse.json(
        { error: 'Erreur lors de l\'enregistrement' },
        { status: 500 }
      )
    }

    console.log('✅ Présence enregistrée avec succès')
    console.log('=================================')

    return NextResponse.json({
      success: true,
      message: 'Présence enregistrée avec succès',
      distance: Math.round(distance)
    })
  } catch (error) {
    console.error('❌ Erreur globale:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
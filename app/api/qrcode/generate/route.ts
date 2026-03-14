import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import QRCode from 'qrcode'
import { randomBytes } from 'crypto'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    // Vérifier le rôle
    if (user.role !== 'service_manager' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { serviceId } = await request.json()
    
    // Utiliser le serviceId de l'utilisateur si non fourni
    const targetServiceId = serviceId || user.serviceId
    
    if (!targetServiceId) {
      return NextResponse.json({ error: 'Service ID requis' }, { status: 400 })
    }

    // Générer un token unique pour le QR code
    const qrToken = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 2)
    
    const today = new Date().toISOString().split('T')[0]

    // Créer la session
    const { data: session, error } = await supabase
      .from('sessions')
      .insert([
        {
          service_id: targetServiceId,
          qr_token: qrToken,
          expires_at: expiresAt.toISOString(),
          date: today
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Erreur création session:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la création de la session' },
        { status: 500 }
      )
    }

    // Générer l'URL du QR code
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const qrData = `${baseUrl}/scan?token=${qrToken}&session=${session.id}`
    
    // Générer le QR code en data URL
    const qrCodeDataURL = await QRCode.toDataURL(qrData)

    return NextResponse.json({
      qrCode: qrCodeDataURL,
      sessionId: session.id,
      expiresAt: session.expires_at
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
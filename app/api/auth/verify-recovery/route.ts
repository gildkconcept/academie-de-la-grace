// app/api/auth/verify-recovery/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { checkRateLimit, recordAttempt, resetAttempts } from '@/lib/rate-limit'
import { verifyRecoverySchema } from '@/lib/validators'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // ✅ Valider les entrées avec Zod
    const validation = verifyRecoverySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }
    
    const { phone, fullName, branch, serviceId } = validation.data

    // Rate limiting basé sur le téléphone
    const rateLimitKey = `recovery:${phone}`
    const rateCheck = checkRateLimit(rateLimitKey)

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: rateCheck.message || 'Trop de tentatives' },
        { status: 429 }
      )
    }

    // Journaliser la tentative
    console.log('🔍 Tentative récupération:', { phone, fullName, branch, serviceId })

    // Chercher l'étudiant par téléphone (non supprimé)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, full_name, branch, service_id, phone, username')
      .eq('phone', phone)
      .is('deleted_at', null)
      .maybeSingle()

    if (studentError) {
      console.error('Erreur recherche étudiant:', studentError)
      recordAttempt(rateLimitKey)
      return NextResponse.json(
        { error: 'Erreur lors de la recherche' },
        { status: 500 }
      )
    }

    if (!student) {
      recordAttempt(rateLimitKey)
      return NextResponse.json(
        { error: 'Aucun compte trouvé avec ce numéro de téléphone' },
        { status: 404 }
      )
    }

    // Vérifier les correspondances
    const nameMatch = student.full_name.toLowerCase().trim() === fullName.toLowerCase().trim()
    const branchMatch = student.branch.toLowerCase().trim() === branch.toLowerCase().trim()
    const serviceMatch = student.service_id === serviceId

    if (!nameMatch || !branchMatch || !serviceMatch) {
      recordAttempt(rateLimitKey)
      
      // Message détaillé
      const errors: string[] = []
      if (!nameMatch) errors.push('nom complet')
      if (!branchMatch) errors.push('branche')
      if (!serviceMatch) errors.push('service')
      
      return NextResponse.json(
        { 
          error: `Les informations fournies ne correspondent pas. Vérifiez : ${errors.join(', ')}.`,
          remaining: rateCheck.remaining
        },
        { status: 400 }
      )
    }

    // Tout correspond → autoriser la réinitialisation
    resetAttempts(rateLimitKey)

    // Générer un token temporaire (valable 15 minutes)
    const recoveryToken = Buffer.from(JSON.stringify({
      studentId: student.id,
      phone: student.phone,
      exp: Date.now() + 15 * 60 * 1000 // 15 minutes
    })).toString('base64')

    return NextResponse.json({
      success: true,
      message: 'Identité vérifiée avec succès',
      recoveryToken,
      student: {
        id: student.id,
        username: student.username
      }
    })

  } catch (error) {
    console.error('Erreur verify-recovery:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
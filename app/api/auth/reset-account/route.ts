// app/api/auth/reset-account/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'
import { resetAccountSchema } from '@/lib/validators'

// Vérifier si un username existe
async function usernameExists(username: string, excludeStudentId?: string): Promise<boolean> {
  let query = supabase
    .from('students')
    .select('id')
    .eq('username', username)
    .is('deleted_at', null)
  
  if (excludeStudentId) {
    query = query.neq('id', excludeStudentId)
  }
  
  const { data } = await query.maybeSingle()
  return !!data
}

// Générer des suggestions de username
async function generateSuggestions(base: string): Promise<string[]> {
  const suggestions: string[] = []
  let i = 1
  while (suggestions.length < 3) {
    const candidate = `${base}${i.toString().padStart(2, '0')}`
    if (!(await usernameExists(candidate))) {
      suggestions.push(candidate)
    }
    i++
  }
  return suggestions
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // ✅ Valider les entrées avec Zod
    const validation = resetAccountSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }
    
    const { recoveryToken, newUsername, newPassword } = validation.data

    // Décoder le token
    let decoded: any
    try {
      decoded = JSON.parse(Buffer.from(recoveryToken, 'base64').toString())
    } catch (error) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 400 }
      )
    }

    // Vérifier l'expiration du token
    if (Date.now() > decoded.exp) {
      return NextResponse.json(
        { error: 'Le lien de réinitialisation a expiré. Veuillez recommencer.' },
        { status: 400 }
      )
    }

    const studentId = decoded.studentId

    // Vérifier que l'étudiant existe toujours
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, username')
      .eq('id', studentId)
      .is('deleted_at', null)
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Étudiant non trouvé ou compte désactivé' },
        { status: 404 }
      )
    }

    // Vérifier disponibilité du username
    const isUsernameTaken = await usernameExists(newUsername, studentId)
    
    if (isUsernameTaken) {
      const suggestions = await generateSuggestions(newUsername)
      return NextResponse.json(
        { 
          error: 'Ce nom d\'utilisateur est déjà utilisé',
          usernameTaken: true,
          suggestions 
        },
        { status: 409 }
      )
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await hashPassword(newPassword)

    // Mettre à jour le compte
    const { error: updateError } = await supabase
      .from('students')
      .update({
        username: newUsername,
        password: hashedPassword
      })
      .eq('id', studentId)

    if (updateError) {
      console.error('Erreur mise à jour:', updateError)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du compte' },
        { status: 500 }
      )
    }

    console.log('✅ Compte réinitialisé:', { studentId, newUsername })

    return NextResponse.json({
      success: true,
      message: 'Compte réinitialisé avec succès',
      username: newUsername
    })

  } catch (error) {
    console.error('Erreur reset-account:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
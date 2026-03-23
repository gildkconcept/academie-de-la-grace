import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fullName, branch, level, serviceId, baptized, phone, username, password } = body

    // Validation du niveau (1, 2 ou 3)
    const levelNumber = parseInt(level)
    if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 3) {
      return NextResponse.json(
        { error: 'Le niveau doit être 1, 2 ou 3' },
        { status: 400 }
      )
    }

    // Vérifier si le nom d'utilisateur ou le téléphone existe déjà
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .or(`username.eq.${username},phone.eq.${phone}`)
      .single()

    if (existingStudent) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec ce nom d\'utilisateur ou ce téléphone' },
        { status: 400 }
      )
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(password)

    // Créer l'étudiant
    const { data: student, error } = await supabase
      .from('students')
      .insert([
        {
          full_name: fullName,
          branch,
          level: levelNumber,
          service_id: serviceId,
          baptized: baptized === 'true',
          phone,
          username,
          password: hashedPassword
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Erreur insertion:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Compte créé avec succès', studentId: student.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
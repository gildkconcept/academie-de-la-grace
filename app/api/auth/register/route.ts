import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

// Fonction pour vérifier si un username existe déjà
async function usernameExists(username: string): Promise<boolean> {
  const { data } = await supabase
    .from('students')
    .select('id')
    .eq('username', username)
    .is('deleted_at', null)
    .single()
  
  return !!data
}

// Fonction pour générer un username unique (fallback)
async function generateUsername(prenom: string, nom: string): Promise<string> {
  const base = `${prenom}.${nom}`.toLowerCase()
  let username = base
  let i = 1

  while (await usernameExists(username)) {
    username = `${base}${i}`
    i++
  }

  return username
}

// Fonction pour extraire prénom et nom
function extractFirstAndLastName(fullName: string): { prenom: string; nom: string } {
  const parts = fullName.trim().split(' ')
  if (parts.length < 2) {
    throw new Error('Veuillez entrer votre nom et prénom complets')
  }
  const prenom = parts[0]
  const nom = parts.slice(1).join(' ')
  return { prenom, nom }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fullName, branch, level, serviceId, baptized, phone, username: userProvidedUsername, password } = body

    // Validation du niveau (1, 2 ou 3)
    const levelNumber = parseInt(level)
    if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 3) {
      return NextResponse.json(
        { error: 'Le niveau doit être 1, 2 ou 3' },
        { status: 400 }
      )
    }

    // Extraire prénom et nom
    let prenom: string, nom: string
    try {
      const result = extractFirstAndLastName(fullName)
      prenom = result.prenom
      nom = result.nom
    } catch (error) {
      return NextResponse.json(
        { error: 'Veuillez entrer votre nom et prénom complets' },
        { status: 400 }
      )
    }

    // Vérifier si le téléphone existe déjà (uniquement chez les actifs)
    const { data: existingPhone } = await supabase
      .from('students')
      .select('id')
      .eq('phone', phone)
      .is('deleted_at', null)
      .single()

    if (existingPhone) {
      return NextResponse.json(
        { error: 'Ce numéro de téléphone est déjà utilisé' },
        { status: 400 }
      )
    }

    // Générer ou valider le username
    let username: string
    if (userProvidedUsername && userProvidedUsername.length >= 3) {
      // L'utilisateur a choisi son username, vérifier qu'il n'existe pas
      const usernameAlreadyExists = await usernameExists(userProvidedUsername)
      if (usernameAlreadyExists) {
        return NextResponse.json(
          { error: 'Ce nom d\'utilisateur est déjà pris' },
          { status: 400 }
        )
      }
      username = userProvidedUsername
    } else {
      // Générer automatiquement à partir du prénom et nom
      username = await generateUsername(prenom, nom)
    }

    // Hasher le mot de passe
    const hashedPassword = await hashPassword(password)

    // Créer l'étudiant
    const { data: student, error } = await supabase
      .from('students')
      .insert([
        {
          full_name: fullName,
          prenom: prenom,
          nom: nom,
          username: username,
          branch,
          level: levelNumber,
          service_id: serviceId,
          baptized: baptized === 'true',
          phone,
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
      { 
        message: 'Compte créé avec succès',
        username: username,
        studentId: student.id 
      },
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
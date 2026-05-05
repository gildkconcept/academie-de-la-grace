import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'
import { registerSchema } from '@/lib/validators'

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
    
    // ✅ Valider les entrées avec Zod
    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }
    
    const { 
      fullName, 
      branch, 
      level, 
      serviceId, 
      baptized, 
      phone, 
      username: userProvidedUsername, 
      password, 
      maisonGrace 
    } = validation.data

    // Validation du niveau (déjà fait par Zod, mais on garde pour la conversion)
    const levelNumber = parseInt(level)

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

    // baptized est déjà un booléen grâce à Zod
    const baptizedBoolean = baptized

    console.log('📝 Inscription - Baptême reçu:', baptized, 'converti en:', baptizedBoolean)
    console.log('📝 Maison de grâce:', maisonGrace || 'non spécifiée')

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
          baptized: baptizedBoolean,
          phone,
          password: hashedPassword,
          maison_grace: maisonGrace || null
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
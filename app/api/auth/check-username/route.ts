import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

// Fonction pour générer des suggestions uniques
async function generateUniqueSuggestions(base: string): Promise<string[]> {
  const suggestions: string[] = []
  let i = 1

  while (suggestions.length < 3) {
    const candidate = `${base}${i}`
    if (!(await usernameExists(candidate))) {
      suggestions.push(candidate)
    }
    i++
  }

  return suggestions
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: 'Le nom d\'utilisateur doit contenir au moins 3 caractères' },
        { status: 400 }
      )
    }

    // Vérifier si le username existe
    const exists = await usernameExists(username)

    if (!exists) {
      return NextResponse.json({
        available: true,
        suggestions: []
      })
    }

    // Générer des suggestions uniques
    const base = username
    const suggestions = await generateUniqueSuggestions(base)

    return NextResponse.json({
      available: false,
      suggestions: suggestions
    })
  } catch (error) {
    console.error('Erreur check-username:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
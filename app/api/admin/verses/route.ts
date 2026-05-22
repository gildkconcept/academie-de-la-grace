import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// GET - Récupérer tous les versets programmés
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('daily_verse')
      .select('*')
      .order('displayed_date', { ascending: false })
    
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET versets:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Créer un nouveau verset
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    
    const user = verifyToken(token)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    
    const body = await request.json()
    const { verse, reference, displayed_date } = body
    
    console.log('📝 Données reçues:', { verse, reference, displayed_date })
    
    // Validation
    if (!verse || !reference || !displayed_date) {
      return NextResponse.json({ 
        error: 'Champs requis: verse, reference, displayed_date' 
      }, { status: 400 })
    }
    
    // Vérifier si un verset existe déjà pour cette date
    const { data: existing } = await supabase
      .from('daily_verse')
      .select('id')
      .eq('displayed_date', displayed_date)
      .maybeSingle()
    
    if (existing) {
      return NextResponse.json({ 
        error: `Un verset existe déjà pour le ${displayed_date}` 
      }, { status: 400 })
    }
    
    // Insérer le verset
    const { data, error } = await supabase
      .from('daily_verse')
      .insert([{
        verse: verse,
        reference: reference,
        displayed_date: displayed_date,
        is_active: true,
        created_by: user.id
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Erreur insertion:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('✅ Verset créé:', data)
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Erreur POST versets:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT - Modifier un verset
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    
    const user = verifyToken(token)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    
    const body = await request.json()
    const { id, verse, reference, displayed_date, is_active } = body
    
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('daily_verse')
      .update({ 
        verse, 
        reference, 
        displayed_date, 
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Erreur mise à jour:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
    
  } catch (error) {
    console.error('Erreur PUT versets:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer un verset
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    
    const user = verifyToken(token)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }
    
    const { error } = await supabase
      .from('daily_verse')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Erreur suppression:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Erreur DELETE versets:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
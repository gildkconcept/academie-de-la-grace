import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const user = verifyToken(token)
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { name, username, email, phone } = await request.json()

    // Validation
    if (!name || !username) {
      return NextResponse.json(
        { error: 'Le nom et le nom d\'utilisateur sont requis' },
        { status: 400 }
      )
    }

    // Vérifier si le nom d'utilisateur est déjà pris (par un autre utilisateur)
    if (username !== user.username) {
      // Vérifier dans users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .maybeSingle()

      if (existingUser) {
        return NextResponse.json(
          { error: 'Ce nom d\'utilisateur est déjà utilisé' },
          { status: 400 }
        )
      }

      // Vérifier dans students
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .maybeSingle()

      if (existingStudent) {
        return NextResponse.json(
          { error: 'Ce nom d\'utilisateur est déjà utilisé' },
          { status: 400 }
        )
      }
    }

    let updateData: any = {}
    let table = ''

    // Déterminer la table et les données à mettre à jour
    if (user.role === 'superadmin' || user.role === 'service_manager') {
      table = 'users'
      updateData = {
        name,
        username,
        email: email || null
      }
    } else {
      table = 'students'
      updateData = {
        full_name: name,
        username,
        email: email || null,
        phone: phone || null
      }
    }

    console.log('Mise à jour profil:', { table, userId: user.id, updateData })

    // Mettre à jour le profil
    const { data, error } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Erreur mise à jour:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: data
    })

  } catch (error) {
    console.error('Erreur globale:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
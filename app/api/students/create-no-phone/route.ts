import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé. Seul le Super Admin peut créer des étudiants sans téléphone.' }, { status: 403 })
    }

    const { fullName, branch, level, serviceId, baptized, maisonGrace, profileImageUrl } = await request.json()

    if (!fullName || !branch || !level || !serviceId) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    // Générer un username unique
    const baseUsername = fullName.toLowerCase().replace(/\s/g, '.')
    let username = baseUsername
    let counter = 1
    let exists = true
    
    while (exists) {
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      
      if (!existing) {
        exists = false
      } else {
        username = `${baseUsername}${counter}`
        counter++
      }
    }

    // Générer un mot de passe aléatoire (l'étudiant ne s'en servira pas)
    const randomPassword = Math.random().toString(36).slice(-8) + 'NoPhone123!'
    const hashedPassword = await bcrypt.hash(randomPassword, 10)

    // Créer l'étudiant
    const { data: student, error } = await supabase
      .from('students')
      .insert({
        full_name: fullName,
        username,
        branch,
        level: parseInt(level),
        service_id: serviceId,
        baptized: baptized === 'true' || baptized === true,
        maison_grace: maisonGrace || null,
        profile_image_url: profileImageUrl || null,
        has_phone: false,
        password: hashedPassword,
        phone: null
      })
      .select()
      .single()

    if (error) {
      console.error('Erreur création étudiant:', error)
      return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Étudiant sans téléphone créé avec succès',
      student: {
        id: student.id,
        full_name: student.full_name,
        username: student.username
      }
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
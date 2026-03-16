import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
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

    // Vérifier que l'utilisateur est un manager ou superadmin
    if (user.role !== 'service_manager' && user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Seuls les managers peuvent ajouter des étudiants' },
        { status: 403 }
      )
    }

    const { fullName, username, branch, level, baptized, phone, password, serviceId } = await request.json()

    // Validations
    if (!fullName || !username || !branch || !level || !password) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    // Vérifier si le nom d'utilisateur existe déjà
    const { data: existingUser } = await supabase
      .from('students')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ce nom d\'utilisateur est déjà utilisé' },
        { status: 400 }
      )
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10)

    // Déterminer le service_id
    const targetServiceId = serviceId || user.serviceId

    if (!targetServiceId) {
      return NextResponse.json(
        { error: 'Service ID requis' },
        { status: 400 }
      )
    }

    // Créer l'étudiant
    const { data: student, error } = await supabase
      .from('students')
      .insert([
        {
          full_name: fullName,
          username,
          branch,
          level: parseInt(level),
          service_id: targetServiceId,
          baptized: baptized === 'true',
          phone: phone || null,
          password: hashedPassword
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Erreur création étudiant:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la création de l\'étudiant' },
        { status: 500 }
      )
    }

    console.log('✅ Étudiant créé avec succès:', student.id)

    return NextResponse.json({
      success: true,
      message: 'Étudiant ajouté avec succès',
      student: {
        id: student.id,
        fullName: student.full_name,
        username: student.username
      }
    })

  } catch (error) {
    console.error('❌ Erreur globale:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
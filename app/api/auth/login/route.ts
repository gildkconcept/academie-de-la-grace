import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { comparePassword, generateToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()
    
    console.log('=== TENTATIVE DE CONNEXION ===')
    console.log('Username:', username)
    console.log('Password reçu:', password ? '✓' : '✗')

    // Vérifier d'abord dans users (admins/managers)
    console.log('Recherche dans users...')
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (userError) {
      console.log('Erreur recherche users:', userError.message)
    }

    if (user) {
      console.log('Utilisateur trouvé dans users:', user.username)
      console.log('Hash en BD:', user.password.substring(0, 20) + '...')
      
      const passwordValid = await comparePassword(password, user.password)
      console.log('Mot de passe valide:', passwordValid)
      
      if (passwordValid) {
        const token = generateToken(user)
        console.log('Connexion réussie pour:', username)
        return NextResponse.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
            serviceId: user.service_id
          }
        })
      }
    } else {
      console.log('Aucun utilisateur trouvé avec ce username')
    }

    // Vérifier dans students
    console.log('Recherche dans students...')
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('username', username)
      .single()

    if (studentError) {
      console.log('Erreur recherche students:', studentError.message)
    }

    if (student) {
      console.log('Étudiant trouvé:', student.username)
      console.log('Hash en BD:', student.password.substring(0, 20) + '...')
      
      const passwordValid = await comparePassword(password, student.password)
      console.log('Mot de passe valide:', passwordValid)
      
      if (passwordValid) {
        const token = generateToken({ ...student, role: 'student' })
        console.log('Connexion réussie pour étudiant:', username)
        return NextResponse.json({
          token,
          user: {
            id: student.id,
            name: student.full_name,
            username: student.username,
            role: 'student',
            serviceId: student.service_id
          }
        })
      }
    }

    console.log('=== ÉCHEC DE CONNEXION ===')
    return NextResponse.json(
      { error: 'Nom d\'utilisateur ou mot de passe incorrect' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Erreur login:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
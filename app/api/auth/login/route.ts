import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { comparePassword, generateToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()
    
    console.log('=== TENTATIVE DE CONNEXION ===')
    console.log('Username:', username)

    // Vérifier d'abord dans users (admins/managers)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (user && await comparePassword(password, user.password)) {
      const token = generateToken(user)
      return NextResponse.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          serviceId: user.service_id,
          level: null
        }
      })
    }

    // Vérifier dans students
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, full_name, username, password, service_id, level, email, phone')
      .eq('username', username)
      .single()

    if (student && await comparePassword(password, student.password)) {
      console.log('📊 Étudiant trouvé - Niveau:', student.level)
      
      const token = generateToken({ 
        id: student.id,
        name: student.full_name,
        username: student.username,
        role: 'student',
        service_id: student.service_id,
        level: student.level
      })
      
      return NextResponse.json({
        token,
        user: {
          id: student.id,
          name: student.full_name,
          username: student.username,
          role: 'student',
          serviceId: student.service_id,
          level: student.level  // 1, 2 ou 3
        }
      })
    }

    console.log('Échec de connexion pour:', username)
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
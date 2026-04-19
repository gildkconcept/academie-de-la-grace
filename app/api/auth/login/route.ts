import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { comparePassword, generateToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()
    
    console.log('=== TENTATIVE DE CONNEXION ===')
    console.log('Username:', username)

    // Vérifier dans users (admins/managers)
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle()

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

    // Vérifier dans students (uniquement ceux qui ne sont pas supprimés)
    const { data: student } = await supabase
      .from('students')
      .select('id, full_name, username, password, service_id, level, email, phone')
      .eq('username', username)
      .is('deleted_at', null)   // ← Ignorer les comptes soft-deleted
      .maybeSingle()

    if (student && await comparePassword(password, student.password)) {
      console.log('📊 Étudiant trouvé - ID:', student.id)
      console.log('📊 Nom:', student.full_name)
      console.log('📊 Niveau:', student.level)
      
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
          level: student.level
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
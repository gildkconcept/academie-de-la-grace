// app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { comparePassword, generateToken } from '@/lib/auth'
import { loginSchema } from '@/lib/validators'

// Désactiver les logs en production
const isProduction = process.env.NODE_ENV === 'production'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Valider les entrées avec Zod
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {

      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }
    
    const { username, password } = validation.data
    


    // Vérifier dans users (admins/managers)
    const { data: user } = await supabase
      .from('users')
      .select('id, name, username, password, role, service_id')
      .eq('username', username)
      .maybeSingle()

    if (user && await comparePassword(password, user.password)) {
      const token = generateToken(user)
      
      const response = NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          serviceId: user.service_id,
          level: null
        }
      })

      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/'
      })


      return response
    }

    // Vérifier dans students
    const { data: student } = await supabase
      .from('students')
      .select('id, full_name, username, password, service_id, level, email, phone')
      .eq('username', username)
      .is('deleted_at', null)
      .maybeSingle()

    if (student && await comparePassword(password, student.password)) {
    
      
      const token = generateToken({ 
        id: student.id,
        name: student.full_name,
        username: student.username,
        role: 'student',
        service_id: student.service_id,
        level: student.level
      })
      
      const response = NextResponse.json({
        user: {
          id: student.id,
          name: student.full_name,
          username: student.username,
          role: 'student',
          serviceId: student.service_id,
          level: student.level
        }
      })

      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/'
      })

    
      return response
    }


    return NextResponse.json(
      { error: 'Nom d\'utilisateur ou mot de passe incorrect' },
      { status: 401 }
    )
  } catch (error) {

    if (!isProduction) {
      console.error('Erreur serveur lors du login')
    }
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
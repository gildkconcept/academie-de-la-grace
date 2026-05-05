import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { comparePassword, generateToken } from '@/lib/auth'
import { loginSchema } from '@/lib/validators'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // ✅ Valider les entrées avec Zod
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      logger.fail('Validation des données de connexion', { errors: validation.error.errors })
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }
    
    const { username, password } = validation.data
    
    logger.start('Tentative de connexion', { username })

    // Vérifier dans users (admins/managers)
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle()

    if (user && await comparePassword(password, user.password)) {
      const token = generateToken(user)
      
      // Créer la réponse avec les données utilisateur
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

      // Stocker le token dans un cookie HttpOnly sécurisé
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/'
      })

      logger.success('Connexion admin réussie', { userId: user.id, username, role: user.role })
      return response
    }

    // Vérifier dans students (uniquement ceux qui ne sont pas supprimés)
    const { data: student } = await supabase
      .from('students')
      .select('id, full_name, username, password, service_id, level, email, phone')
      .eq('username', username)
      .is('deleted_at', null)
      .maybeSingle()

    if (student && await comparePassword(password, student.password)) {
      logger.debug('Étudiant trouvé', { 
        studentId: student.id, 
        name: student.full_name, 
        level: student.level 
      })
      
      const token = generateToken({ 
        id: student.id,
        name: student.full_name,
        username: student.username,
        role: 'student',
        service_id: student.service_id,
        level: student.level
      })
      
      // Créer la réponse avec les données utilisateur
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

      // Stocker le token dans un cookie HttpOnly sécurisé
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/'
      })

      logger.success('Connexion étudiant réussie', { 
        studentId: student.id, 
        username, 
        level: student.level 
      })
      return response
    }

    logger.fail('Connexion échouée', { username, reason: 'Identifiants incorrects' })
    return NextResponse.json(
      { error: 'Nom d\'utilisateur ou mot de passe incorrect' },
      { status: 401 }
    )
  } catch (error) {
    logger.error('Erreur serveur lors du login', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
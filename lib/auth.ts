import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { supabase } from './supabase'

const JWT_SECRET = process.env.JWT_SECRET!

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string) {
  try {
    console.log('Comparaison mot de passe...')
    const result = await bcrypt.compare(password, hash)
    console.log('Résultat comparaison:', result)
    return result
  } catch (error) {
    console.error('Erreur comparaison:', error)
    return false
  }
}

export function generateToken(user: any) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      name: user.name,
      role: user.role,
      serviceId: user.service_id 
    }, 
    JWT_SECRET, 
    { expiresIn: '7d' }
  )
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}
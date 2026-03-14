import jwt, { JwtPayload } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { supabase } from './supabase'

const JWT_SECRET = process.env.JWT_SECRET!

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string) {
  try {
    return await bcrypt.compare(password, hash)
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
    const decoded = jwt.verify(token, JWT_SECRET)
    // Vérifier que c'est bien un objet avec les propriétés attendues
    if (typeof decoded === 'object' && decoded !== null) {
      return decoded as JwtPayload & {
        id: string
        username: string
        name: string
        role: string
        serviceId?: string
      }
    }
    return null
  } catch (error) {
    return null
  }
}
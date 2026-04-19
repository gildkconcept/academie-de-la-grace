import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

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
  // Pour les étudiants, on inclut le niveau
  const payload: any = { 
    id: user.id, 
    username: user.username,
    name: user.name || user.full_name,
    role: user.role,
    serviceId: user.service_id
  }
  
  // Si c'est un étudiant, ajouter le niveau
  if (user.role === 'student' && user.level) {
    payload.level = user.level
  }
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (typeof decoded === 'object' && decoded !== null) {
      return decoded as jwt.JwtPayload & {
        id: string
        username: string
        name: string
        role: string
        serviceId?: string
        level?: number
      }
    }
    return null
  } catch (error) {
    return null
  }
}
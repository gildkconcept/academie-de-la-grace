export type UserRole = 'superadmin' | 'service_manager' | 'student'

export interface User {
  id: string
  name: string
  username: string
  role: UserRole
  serviceId?: string
  email?: string
  phone?: string
  level?: 1 | 2 | 3  // Maintenant 1, 2 ou 3
}

export interface Student {
  id: string
  full_name: string
  branch: string
  level: 1 | 2 | 3  // Maintenant 1, 2 ou 3
  service_id: string
  baptized: boolean
  phone?: string
  username: string
  email?: string
  created_at: Date
}

export interface Service {
  id: string
  name: string
  description?: string
}

export interface Session {
  id: string
  service_id?: string
  code: string
  expires_at: Date
  date: Date
  created_at?: Date
}

export interface Attendance {
  id: string
  student_id: string
  session_id: string
  status: 'present' | 'absent' | 'late'
  scanned_at?: Date
  date: Date
}

export interface Progress {
  id: string
  student_id: string
  level: 1 | 2 | 3  
  module: string
  score: number
  completed: boolean
}
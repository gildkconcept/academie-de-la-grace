export type UserRole = 'superadmin' | 'service_manager' | 'student'

export interface User {
  id: string
  name: string
  username: string  // Au lieu de email
  role: UserRole
  serviceId?: string
}

export interface Student {
  id: string
  full_name: string
  branch: string
  level: 1 | 2
  service_id: string
  baptized: boolean
  phone: string
  username: string  // Au lieu de email
  created_at: Date
}

// Le reste reste identique...
export interface Service {
  id: string
  name: string
  description?: string
}

export interface Session {
  id: string
  service_id: string
  qr_token: string
  expires_at: Date
  date: Date
}

export interface Attendance {
  id: string
  student_id: string
  session_id: string
  status: 'present' | 'absent' | 'late'
  scanned_at: Date
  date: Date
}

export interface Progress {
  id: string
  student_id: string
  level: 1 | 2
  module: string
  score: number
  completed: boolean
}
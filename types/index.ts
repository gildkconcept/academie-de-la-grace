export type UserRole = 'superadmin' | 'service_manager' | 'student'
export * from './attendance'
export interface User {
  id: string
  name: string
  username: string
  role: UserRole
  serviceId?: string
  email?: string
  phone?: string
  level?: 1 | 2 | 3
}

export interface Student {
  id: string
  full_name: string
  branch: string
  level: 1 | 2 | 3
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

// Sessions académiques (code)
export interface AcademySession {
  id: string
  code: string
  date: string
  expires_at: string
  created_at: string
  created_by?: string
}

export interface AcademyAttendance {
  id: string
  student_id: string
  academy_session_id: string
  status: 'present' | 'absent' | 'late'
  scanned_at: string
}

// Sessions de service (checkbox)
export interface ServiceSession {
  id: string
  service_id: string
  date: string
  created_at: string
  created_by?: string
}

export interface ServiceAttendance {
  id: string
  student_id: string
  service_session_id: string
  status: 'present' | 'absent' | 'late'
  marked_at: string
}

// Pour l'analyse croisée
export interface CrossAttendance {
  student_id: string
  student_name: string
  service: string
  service_present: boolean
  academic_present: boolean
}

// Pour la présence académique (ancien système)
export interface Attendance {
  id: string
  student_id: string
  session_id: string
  status: 'present' | 'absent' | 'late'
  scanned_at?: Date
  date: Date
  sessions?: {
    code: string
    date: string
    created_at: string
  }
}
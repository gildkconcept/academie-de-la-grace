export type UserRole = 'superadmin' | 'service_manager' | 'student'

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

export interface Progress {
  id: string
  student_id: string
  level: 1 | 2 | 3
  module: string
  score: number
  completed: boolean
}

// Sessions académiques (code) – avec géolocalisation
export interface AcademySession {
  id: string
  code: string
  date: string
  type?: string
  expires_at: string
  created_at: string
  created_by?: string
  lat: number           // latitude du superadmin
  lng: number           // longitude
  radius: number        // rayon en mètres
  session_type?: {
    code: string
    label: string
    day_of_week: string
  }
}

export interface AcademyAttendance {
  id: string
  student_id: string
  academy_session_id: string
  status: 'present' | 'absent' | 'late'
  scanned_at: string
  student_lat?: number   // position de l'étudiant
  student_lng?: number
  distance?: number      // distance calculée
}

// Sessions de service (checkbox)
export interface ServiceSession {
  id: string
  service_id: string
  date: string
  type?: string
  created_at: string
  created_by?: string
  session_type?: {
    code: string
    label: string
    day_of_week: string
  }
}

export interface ServiceAttendance {
  id: string
  student_id: string
  service_session_id: string
  status: 'present' | 'absent' | 'late'
  marked_at: string
}

export interface CrossAttendance {
  student_id: string
  student_name: string
  service: string
  service_present: boolean
  academic_present: boolean
}

// Pour la présence académique (ancien nom, mais on garde la compatibilité)
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
  student_lat?: number
  student_lng?: number
  distance?: number
}
// ... (contenu existant) ...

// === STATISTIQUES GLOBALES POUR SUPERADMIN ===
export interface GlobalStats {
  totalStudents: number
  totalServices: number
  totalAttendance: number       // nombre total de présences académiques
  expectedAttendance: number    // nombre total attendu (étudiants × sessions)
  globalAttendanceRate: number
  bestService: {
    id: string
    name: string
    rate: number
    totalStudents: number
    presentCount: number
  } | null
  strugglingService: {
    id: string
    name: string
    rate: number
    totalStudents: number
    presentCount: number
  } | null
  attendanceByService: {
    serviceId: string
    serviceName: string
    totalStudents: number
    presentCount: number
    rate: number
  }[]
  attendanceOverTime: {
    month: string
    rate: number
    present: number
    total: number
  }[]
}

// === BADGES ===
export interface Badge {
  id: string
  name: string
  description: string
  icon?: string
  condition_type: 'perfect_attendance' | 'faithful_sunday' | 'disciplined'
  condition_value?: string
}

export interface StudentBadge {
  id: string
  student_id: string
  badge_id: string
  awarded_at: string
  badge?: Badge
}
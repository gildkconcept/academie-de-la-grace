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
  deleted_at?: string | null
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
  lat: number
  lng: number
  radius: number
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
  student_lat?: number
  student_lng?: number
  distance?: number
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

// === STATISTIQUES GLOBALES POUR SUPERADMIN ===
export interface GlobalStats {
  totalStudents: number
  totalServices: number
  totalAttendance: number
  expectedAttendance: number
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
  condition_type: 'perfect_attendance' | 'faithful_sunday' | 'disciplined' | 'perfect_quiz' | 'faithful_quiz'
  condition_value?: string
}

export interface StudentBadge {
  id: string
  student_id: string
  badge_id: string
  awarded_at: string
  badge?: Badge
}

// === QUIZ ===
export interface Quiz {
  id: string
  title: string
  description?: string
  level: 1 | 2 | 3
  start_date: string
  end_date: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  questions?: Question[]
  completed?: boolean
  result?: QuizResult
}

export interface Question {
  id: string
  quiz_id: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  order_index: number
  created_at: string
}

export interface QuizAnswer {
  id: string
  student_id: string
  quiz_id: string
  question_id: string
  selected_answer: 'A' | 'B' | 'C' | 'D' | null
  is_correct: boolean
  answered_at: string
}

export interface QuizResult {
  id: string
  student_id: string
  quiz_id: string
  score: number
  total_questions: number
  percentage: number
  submitted_at: string
  student?: {
    id: string
    full_name: string
    username: string
  }
  quiz?: Quiz
}

export interface QuizWithStatus extends Quiz {
  completed: boolean
  result: QuizResult | null
}
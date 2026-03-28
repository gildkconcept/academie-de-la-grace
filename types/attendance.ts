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
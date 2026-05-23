import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Total des étudiants sans téléphone
    const { count: total } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('has_phone', false)
      .is('deleted_at', null)

    // Présences aujourd'hui
    const today = new Date().toISOString().split('T')[0]
    const { data: noPhoneStudents } = await supabase
      .from('students')
      .select('id')
      .eq('has_phone', false)
      .is('deleted_at', null)

    const studentIds = noPhoneStudents?.map(s => s.id) || []

    const { data: attendances } = await supabase
      .from('attendance')
      .select('student_id')
      .eq('date', today)
      .eq('method', 'assisted')
      .in('student_id', studentIds)

    const present = attendances?.length || 0

    return NextResponse.json({ total: total || 0, present })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
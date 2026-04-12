import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

// Fonction pour attribuer un badge à un étudiant
async function awardBadge(studentId: string, badgeName: string) {
  const { data: badge } = await supabase
    .from('badges')
    .select('id')
    .eq('name', badgeName)
    .single()
  if (!badge) return false
  const { error } = await supabase
    .from('student_badges')
    .insert({ student_id: studentId, badge_id: badge.id })
    .select()
  return !error
}

// Vérifier badge "Présence parfaite" (100% sur 4 dernières semaines)
async function checkPerfectAttendance(studentId: string): Promise<boolean> {
  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, date')
    .gte('date', fourWeeksAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })
  if (!sessions?.length) return false
  const sessionIds = sessions.map(s => s.id)
  const { data: attendance } = await supabase
    .from('attendance')
    .select('status')
    .eq('student_id', studentId)
    .in('session_id', sessionIds)
  const total = sessions.length
  const present = attendance?.filter(a => a.status === 'present').length || 0
  if (total > 0 && present === total) {
    return await awardBadge(studentId, 'Présence parfaite')
  }
  return false
}

// Vérifier badge "Fidèle" (présent à tous les cultes du dimanche sur une période)
async function checkFaithful(studentId: string): Promise<boolean> {
  // Période : 4 semaines de dimanches
  const fourWeeksAgo = new Date()
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, date')
    .gte('date', fourWeeksAgo.toISOString().split('T')[0])
    .order('date', { ascending: true })
  // Filtrer les dimanches (0 = dimanche en JS)
  const sundaySessions = sessions?.filter(s => new Date(s.date).getDay() === 0) || []
  if (sundaySessions.length === 0) return false
  const sessionIds = sundaySessions.map(s => s.id)
  const { data: attendance } = await supabase
    .from('attendance')
    .select('status')
    .eq('student_id', studentId)
    .in('session_id', sessionIds)
  const presentCount = attendance?.filter(a => a.status === 'present').length || 0
  if (presentCount === sundaySessions.length) {
    return await awardBadge(studentId, 'Fidèle')
  }
  return false
}

// Vérifier badge "Discipliné" (niveau académique complet)
async function checkDisciplined(studentId: string): Promise<boolean> {
  const { data: progress } = await supabase
    .from('progress')
    .select('completed, level')
    .eq('student_id', studentId)
  if (!progress) return false
  // Vérifier si tous les modules du niveau 1 sont complétés (exemple)
  const level1Modules = progress.filter(p => p.level === 1)
  const allCompleted = level1Modules.length > 0 && level1Modules.every(p => p.completed === true)
  if (allCompleted) {
    return await awardBadge(studentId, 'Discipliné')
  }
  return false
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const token = authHeader.split(' ')[1]
  const user = verifyToken(token)
  if (!user || user.role !== 'student') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const awarded = []
  if (await checkPerfectAttendance(user.id)) awarded.push('Présence parfaite')
  if (await checkFaithful(user.id)) awarded.push('Fidèle')
  if (await checkDisciplined(user.id)) awarded.push('Discipliné')

  return NextResponse.json({ awarded })
}
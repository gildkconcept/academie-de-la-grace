import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const token = authHeader.split(' ')[1]
  const user = verifyToken(token)
  if (!user || user.role !== 'student') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { data: badges } = await supabase
    .from('student_badges')
    .select('*, badge:badges(*)')
    .eq('student_id', user.id)
    .order('awarded_at', { ascending: false })

  return NextResponse.json(badges || [])
}
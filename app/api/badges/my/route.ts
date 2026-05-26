// app/api/badges/my/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  // ✅ Lire le token depuis le cookie
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  
  if (!token) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  
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
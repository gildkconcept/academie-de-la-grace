// app/api/profile/delete-photo/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Supprimer du storage
    const exts = ['jpg', 'jpeg', 'png', 'webp']
    const files = exts.map(ext => `${user.id}/profile.${ext}`)
    await supabase.storage.from('student-profiles').remove(files)

    // Mettre à jour dans la base
    const table = (user.role === 'superadmin' || user.role === 'service_manager') ? 'users' : 'students'
    await supabase
      .from(table)
      .update({ profile_image_url: null })
      .eq('id', user.id)

    return NextResponse.json({ message: 'Photo supprimée' })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
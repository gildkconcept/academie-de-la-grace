// app/api/profile/upload-photo/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
    }

    // Validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format non autorisé (JPG, PNG, WebP)' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image trop volumineuse (max 5 MB)' }, { status: 400 })
    }

    console.log('📸 UPLOAD PHOTO - userId:', user.id)
    console.log('📸 UPLOAD PHOTO - file:', { name: file.name, type: file.type, size: file.size })

    // Upload
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/profile.${fileExt}`

    // Supprimer l'ancienne photo si elle existe
    const exts = ['jpg', 'jpeg', 'png', 'webp']
    const oldFiles = exts.map(ext => `${user.id}/profile.${ext}`)
    await supabase.storage.from('student-profiles').remove(oldFiles)

    const { error } = await supabase.storage
      .from('student-profiles')
      .upload(fileName, file, { upsert: true })

    if (error) {
      console.error('📸 UPLOAD PHOTO - Erreur Supabase:', error)
      return NextResponse.json({ error: 'Erreur upload' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('student-profiles')
      .getPublicUrl(fileName)

    console.log('📸 UPLOAD PHOTO - url:', urlData.publicUrl)

    // Mettre à jour dans la base
    const table = (user.role === 'superadmin' || user.role === 'service_manager') ? 'users' : 'students'
    
    console.log('📸 UPLOAD PHOTO - updateData:', { table, userId: user.id, profile_image_url: urlData.publicUrl })

    const { error: updateError } = await supabase
      .from(table)
      .update({ profile_image_url: urlData.publicUrl })
      .eq('id', user.id)

    if (updateError) {
      console.error('📸 UPLOAD PHOTO - Erreur update base:', updateError)
      return NextResponse.json({ error: 'Erreur mise à jour profil' }, { status: 500 })
    }

    console.log('📸 UPLOAD PHOTO - ✅ Succès !')
    return NextResponse.json({ url: urlData.publicUrl, message: 'Photo mise à jour' })
  } catch (error) {
    console.error('📸 UPLOAD PHOTO - Erreur globale:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
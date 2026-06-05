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

    console.log('📸 Upload photo - userId:', user.id)
    console.log('📸 Upload photo - file:', { name: file.name, type: file.type, size: file.size })

    // Générer un nom unique pour éviter les conflits
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/profile_${timestamp}.${fileExt}`

    // ✅ SUPPRIMER L'ANCIENNE PHOTO (chercher tous les formats)
    const { data: oldFiles } = await supabase.storage
      .from('student-profiles')
      .list(user.id)

    if (oldFiles && oldFiles.length > 0) {
      const oldPaths = oldFiles.map(f => `${user.id}/${f.name}`)
      await supabase.storage.from('student-profiles').remove(oldPaths)
      console.log('🗑️ Anciennes photos supprimées:', oldPaths)
    }

    // Upload nouvelle photo
    const { error: uploadError } = await supabase.storage
      .from('student-profiles')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true  // ← Permet de remplacer si même nom
      })

    if (uploadError) {
      console.error('❌ Erreur upload:', uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('student-profiles')
      .getPublicUrl(fileName)

    console.log('✅ URL publique:', urlData.publicUrl)

    // Mettre à jour la base
    const table = (user.role === 'superadmin' || user.role === 'service_manager') ? 'users' : 'students'
    
    const { error: updateError } = await supabase
      .from(table)
      .update({ profile_image_url: urlData.publicUrl })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Erreur mise à jour base:', updateError)
      return NextResponse.json({ error: 'Erreur mise à jour profil' }, { status: 500 })
    }

    console.log('✅ Photo mise à jour avec succès !')
    return NextResponse.json({ url: urlData.publicUrl, message: 'Photo mise à jour' })
    
  } catch (error) {
    console.error('❌ Erreur globale:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
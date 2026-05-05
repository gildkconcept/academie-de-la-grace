// services/uploadService.ts
import { supabase } from '@/lib/supabase'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export const uploadService = {
  async uploadAvatar(file: File, studentId: string): Promise<string | null> {
    // Validation du type
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Format non autorisé. Utilisez JPG, PNG ou WebP.')
    }

    // Validation de la taille
    if (file.size > MAX_SIZE) {
      throw new Error('Image trop volumineuse. Maximum 5 MB.')
    }

    // Nom du fichier
    const fileExt = file.name.split('.').pop()
    const fileName = `${studentId}/profile.${fileExt}`

    // Supprimer l'ancienne photo si elle existe
    await supabase.storage
      .from('student-profiles')
      .remove([`${studentId}/profile.jpg`, `${studentId}/profile.png`, `${studentId}/profile.webp`, `${studentId}/profile.jpeg`])

    // Upload nouvelle photo
    const { error } = await supabase.storage
      .from('student-profiles')
      .upload(fileName, file, { upsert: true })

    if (error) {
      console.error('Erreur upload:', error)
      throw new Error('Erreur lors de l\'upload')
    }

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from('student-profiles')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  },

  async deleteAvatar(studentId: string): Promise<void> {
    const exts = ['jpg', 'jpeg', 'png', 'webp']
    const files = exts.map(ext => `${studentId}/profile.${ext}`)
    await supabase.storage
      .from('student-profiles')
      .remove(files)
  },

  getAvatarUrl(studentId: string, existingUrl?: string): string | null {
    if (existingUrl) return existingUrl
    return null
  }
}
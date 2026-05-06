'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CameraIcon, TrashIcon } from '@heroicons/react/24/outline'

interface AvatarUploadProps {
  currentUrl?: string | null
  name?: string
  onUpload: (url: string) => void
  onDelete: () => void
}

export const AvatarUpload = ({ currentUrl, name, onUpload, onDelete }: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) { toast.error('Format non autorisé (JPG, PNG, WebP)'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image trop volumineuse (max 5 MB)'); return }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/profile/upload-photo', { method: 'POST', credentials: 'include', body: formData })
      const data = await res.json()
      if (res.ok) { setPreviewUrl(data.url); onUpload(data.url); toast.success('Photo mise à jour !') }
      else toast.error(data.error || 'Erreur upload')
    } catch (error) { toast.error('Erreur réseau') }
    finally { setUploading(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer la photo ?')) return
    setUploading(true)
    try {
      const res = await fetch('/api/profile/delete-photo', { method: 'DELETE', credentials: 'include' })
      if (res.ok) { setPreviewUrl(null); onDelete(); toast.success('Photo supprimée') }
    } catch (error) { toast.error('Erreur réseau') }
    finally { setUploading(false) }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Photo */}
      <div className="relative">
        {previewUrl ? (
          <img src={previewUrl} alt="Photo de profil" className="w-24 h-24 rounded-full object-cover border-4 border-white/20" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/20">
            <span className="text-3xl font-bold text-white/60">{name?.charAt(0)?.toUpperCase() || '?'}</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Boutons */}
      <div className="flex gap-2">
        <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors">
          <CameraIcon className="w-4 h-4" />
          {previewUrl ? 'Changer' : 'Ajouter'}
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={uploading} />
        </label>
        {previewUrl && (
          <button onClick={handleDelete} disabled={uploading}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors">
            <TrashIcon className="w-4 h-4" /> Supprimer
          </button>
        )}
      </div>
    </div>
  )
}
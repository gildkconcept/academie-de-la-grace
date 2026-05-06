'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Service } from '@/types'
import { EyeIcon, EyeSlashIcon, CameraIcon, TrashIcon } from '@heroicons/react/24/outline'

const branchesList = [
  'Katartizo', 'Anagkazo', 'Prodige', 'Loyauté',
  'Faveur Divine', 'Dunamis', 'Zoé', 'Odiéné', 'Paris'
]

export default function RegisterPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [generatedUsername, setGeneratedUsername] = useState<string | null>(null)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState({
    fullName: '',
    branch: '',
    level: '1',
    serviceId: '',
    baptized: 'false',
    phone: '',
    username: '',
    password: '',
    maisonGrace: '',
    profileImageUrl: ''
  })

  useEffect(() => { fetchServices() }, [])

  useEffect(() => {
    if (formData.username.length < 3) { setUsernameStatus('idle'); setSuggestions([]); return }
    const timeout = setTimeout(async () => {
      setUsernameStatus('checking')
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(formData.username)}`)
        const data = await res.json()
        if (data.available) { setUsernameStatus('available'); setSuggestions([]) }
        else { setUsernameStatus('taken'); setSuggestions(data.suggestions || []) }
      } catch (error) { setUsernameStatus('idle') }
    }, 500)
    return () => clearTimeout(timeout)
  }, [formData.username])

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*').order('name')
    if (data) setServices(data)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Nom d\'utilisateur copié !')
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) { toast.error('Format non autorisé (JPG, PNG, WebP)'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image trop volumineuse (max 5 MB)'); return }
    setUploadingPhoto(true)
    try {
      const fileName = `temp_${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      const { error } = await supabase.storage.from('student-profiles').upload(fileName, file)
      if (error) { toast.error('Erreur lors de l\'upload'); return }
      const { data: urlData } = supabase.storage.from('student-profiles').getPublicUrl(fileName)
      setPreviewUrl(urlData.publicUrl)
      setFormData({ ...formData, profileImageUrl: urlData.publicUrl })
      toast.success('Photo prête !')
    } catch (error) { toast.error('Erreur réseau') }
    finally { setUploadingPhoto(false) }
  }

  const handlePhotoDelete = () => {
    setPreviewUrl(null)
    setFormData({ ...formData, profileImageUrl: '' })
    toast.success('Photo retirée')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (usernameStatus === 'taken') { toast.error('Ce nom d\'utilisateur n\'est pas disponible'); return }
    if (formData.username.length < 3) { toast.error('Le nom d\'utilisateur doit contenir au moins 3 caractères'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          branch: formData.branch,
          level: formData.level,
          serviceId: formData.serviceId,
          baptized: formData.baptized === 'true',
          phone: formData.phone,
          username: formData.username,
          password: formData.password,
          maisonGrace: formData.maisonGrace,
          profileImageUrl: formData.profileImageUrl
        })
      })
      const data = await res.json()
      if (res.ok) {
        setGeneratedUsername(data.username || formData.username)
        toast.success('Compte créé avec succès !')
      } else {
        toast.error(data.error || 'Erreur lors de l\'inscription')
      }
    } catch (error) { toast.error('Une erreur est survenue') }
    finally { setLoading(false) }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const applySuggestion = (suggestion: string) => {
    setFormData({ ...formData, username: suggestion })
    setUsernameStatus('checking')
  }

  // ========== SUCCÈS ==========
  if (generatedUsername) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center" style={{ fontFamily: "'Crimson Text', Georgia, serif", color: 'white' }}>
        <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
        <div className="fixed inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.88) 0%, rgba(15,45,130,0.82) 40%, rgba(10,30,100,0.87) 70%, rgba(4,12,65,0.92) 100%)' }} />
        <div className="relative z-30 w-full max-w-md px-4">
          <div className="bg-white/[0.07] backdrop-blur-3xl border border-white/[0.18] rounded-3xl p-8 text-center shadow-[0_32px_64px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-normal text-white mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
              Compte créé avec succès !
            </h2>
            {previewUrl && (
              <div className="flex justify-center mb-4">
                <img src={previewUrl} alt="Photo" className="w-24 h-24 rounded-full object-cover border-4 border-white/20" />
              </div>
            )}
            <p className="text-blue-200/70 text-sm mb-2">Votre nom d'utilisateur :</p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <code className="text-xl font-mono font-bold text-white bg-white/10 px-4 py-2 rounded-lg">{generatedUsername}</code>
              <button onClick={() => copyToClipboard(generatedUsername)} className="p-2 text-white/50 hover:text-white transition-colors">📋</button>
            </div>
            <p className="text-amber-300/70 text-xs mb-6">⚠️ Conservez précieusement ce nom d'utilisateur pour vous connecter.</p>
            <Link href="/login" className="inline-block bg-white text-[#1a3a8f] px-6 py-3 rounded-lg text-sm font-bold hover:shadow-lg transition-all" style={{ fontFamily: "'Crimson Text', serif" }}>
              Aller à la connexion
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ========== FORMULAIRE ==========
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-12" style={{ fontFamily: "'Crimson Text', Georgia, serif", color: 'white' }}>
      <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
      <div className="fixed inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.88) 0%, rgba(15,45,130,0.82) 40%, rgba(10,30,100,0.87) 70%, rgba(4,12,65,0.92) 100%)' }} />
      <div className="fixed w-[250px] h-[250px] rounded-full bg-blue-400/20 blur-[80px] -top-[30px] -right-[30px] z-20 pointer-events-none" />
      <div className="fixed w-[200px] h-[200px] rounded-full bg-blue-600/15 blur-[80px] bottom-[5%] -left-[30px] z-20 pointer-events-none" />

      <div className="relative z-30 w-full max-w-md px-4">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-sm font-bold text-[#1a3a8f] mx-auto mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>AG</div>
          <h2 className="text-2xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Inscription Étudiant</h2>
          <p className="text-blue-200/70 text-xs mt-1">Rejoignez l'Académie de la Grâce</p>
          <p className="text-blue-200/50 text-xs mt-2 bg-white/5 py-1.5 px-3 rounded-lg inline-block">🔑 Choisissez un nom d'utilisateur unique (minimum 3 caractères)</p>
        </div>

        <div className="bg-white/[0.07] backdrop-blur-3xl border border-white/[0.18] rounded-3xl p-8 shadow-[0_32px_64px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.22)]">
          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Photo de profil */}
            <div>
              <label className="block text-xs text-white/80 mb-1">Photo de profil <span className="text-white/40">(optionnel)</span></label>
              <div className="flex items-center gap-3">
                {previewUrl ? (
                  <div className="relative">
                    <img src={previewUrl} alt="Aperçu" className="w-12 h-12 rounded-full object-cover border-2 border-white/20" />
                    {uploadingPhoto && <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border-2 border-dashed border-white/20">
                    <CameraIcon className="w-5 h-5 text-white/40" />
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20 transition-colors">
                    <CameraIcon className="w-3.5 h-3.5" />
                    {previewUrl ? 'Changer' : 'Ajouter'}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
                  </label>
                  {previewUrl && (
                    <button type="button" onClick={handlePhotoDelete} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-xs hover:bg-red-500/30 transition-colors">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Champs */}
            <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Nom et prénom *" className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-400 text-sm" />
            
            <select name="branch" required value={formData.branch} onChange={handleChange} className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900">
              <option value="">Sélectionnez une branche *</option>
              {branchesList.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <select name="level" required value={formData.level} onChange={handleChange} className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900">
              <option value="1">Niveau 1</option>
              <option value="2">Niveau 2</option>
              <option value="3">Niveau 3</option>
            </select>

            <select name="serviceId" required value={formData.serviceId} onChange={handleChange} className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900">
              <option value="">Sélectionnez un service *</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select name="baptized" required value={formData.baptized} onChange={handleChange} className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900">
              <option value="false">Non baptisé</option>
              <option value="true">Baptisé</option>
            </select>

            <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} placeholder="Téléphone *" className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-400 text-sm" />
            
            <input type="text" name="maisonGrace" value={formData.maisonGrace} onChange={handleChange} placeholder="Maison de grâce (optionnel)" className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-400 text-sm" />

            <div>
              <input type="text" name="username" required minLength={3} value={formData.username} onChange={handleChange} placeholder="Nom d'utilisateur *"
                className={`w-full px-4 py-2.5 bg-white/90 border rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none ${usernameStatus === 'available' ? 'border-green-400' : usernameStatus === 'taken' ? 'border-red-400' : 'border-white/30'}`} />
              {usernameStatus === 'checking' && <p className="text-xs text-white/50 mt-1">⏳ Vérification en cours...</p>}
              {usernameStatus === 'available' && <p className="text-xs text-green-300 mt-1">✅ Disponible</p>}
              {usernameStatus === 'taken' && <p className="text-xs text-red-300 mt-1">❌ Déjà utilisé</p>}
              {suggestions.length > 0 && (
                <div className="mt-1">
                  <p className="text-xs text-white/50">Suggestions :</p>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {suggestions.map(sug => (
                      <button key={sug} type="button" onClick={() => applySuggestion(sug)} className="px-2 py-1 bg-white/10 rounded-md text-xs text-white/80 hover:bg-white/20 transition-colors">{sug}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} name="password" required minLength={6} value={formData.password} onChange={handleChange} placeholder="Mot de passe (min 6 caractères) *"
                className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm pr-10 focus:outline-none focus:border-indigo-400" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>

            <button type="submit" disabled={loading || usernameStatus === 'checking'}
              className="w-full bg-white text-[#1a3a8f] py-2.5 rounded-lg text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
              style={{ fontFamily: "'Crimson Text', serif" }}>
              {loading ? 'Inscription...' : "S'inscrire"}
            </button>
          </form>

          <p className="text-center text-xs text-blue-200/50 mt-6">
            Déjà inscrit ?{' '}
            <Link href="/login" className="text-white hover:underline font-semibold">Se connecter</Link>
          </p>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-blue-200/40 hover:text-white/60 transition-colors">← Retour à l'accueil</Link>
        </div>
      </div>
    </div>
  )
}
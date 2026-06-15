'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { UserCircleIcon, KeyIcon, ArrowLeftIcon, EyeIcon, EyeSlashIcon, CameraIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
// Ajoute cet import en haut avec les autres


interface ProfileSectionProps {
  user: any
  onClose: () => void
}

export const ProfileSection = ({ user, onClose }: ProfileSectionProps) => {
  const { refreshUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loadingUpdate, setLoadingUpdate] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [profileData, setProfileData] = useState({
  name: user?.name || user?.full_name || '',
  username: user?.username || '',
  email: user?.email || '',
  phone: user?.phone || '',
baptized: user?.baptized === true || user?.baptized === 'true' || user?.baptized === 1,
  maisonGrace: user?.maisonGrace || '',
  profileImageUrl: user?.profileImageUrl || user?.profile_image_url || ''
})

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
// Synchroniser le formulaire quand l'utilisateur change
useEffect(() => {
  const isBaptized = user?.baptized === true || user?.baptized === 'true' || user?.baptized === 1
  console.log('🔄 Synchronisation profil:', { original: user?.baptized, converti: isBaptized })
  
  setProfileData({
    name: user?.name || user?.full_name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    baptized: isBaptized,
    maisonGrace: user?.maisonGrace || '',
    profileImageUrl: user?.profileImageUrl || user?.profile_image_url || ''
  })
}, [user])
  const getRoleLabel = () => {
    if (user?.role === 'superadmin') return 'Administrateur'
    if (user?.role === 'service_manager') return 'Responsable de service'
    return 'Étudiant'
  }

  // Upload photo - Version corrigée avec bouton direct
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) { toast.error('Format non autorisé'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image trop volumineuse (max 5 MB)'); return }
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const token = localStorage.getItem('token')
      const res = await fetch('/api/profile/upload-photo', { 
        method: 'POST', 
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include', 
        body: formData 
      })
      const data = await res.json()
      if (res.ok) {
        setProfileData({ ...profileData, profileImageUrl: data.url })
        toast.success('Photo mise à jour !')
      } else { 
        toast.error(data.error || 'Erreur upload') 
      }
    } catch (error) { 
      toast.error('Erreur réseau') 
    } finally { 
      setUploadingPhoto(false) 
    }
  }

  // Suppression photo
  const handlePhotoDelete = async () => {
    if (!confirm('Supprimer votre photo de profil ?')) return
    setUploadingPhoto(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/profile/delete-photo', { 
        method: 'DELETE', 
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include' 
      })
      if (res.ok) {
        setProfileData({ ...profileData, profileImageUrl: '' })
        toast.success('Photo supprimée !')
      }
    } catch (error) { 
      toast.error('Erreur réseau') 
    } finally { 
      setUploadingPhoto(false) 
    }
  }

  // ✅ CORRIGÉ - Plus de reload, juste mise à jour du user
  const handleProfileUpdate = async () => {
    if (!profileData.name || !profileData.username) { 
      toast.error('Le nom et le nom d\'utilisateur sont requis')
      return 
    }
    setLoadingUpdate(true)
    try {
      const token = localStorage.getItem('token')
      const body: any = { 
        name: profileData.name, 
        username: profileData.username, 
        email: profileData.email 
      }
      if (user?.role === 'student') {
        body.phone = profileData.phone
        body.baptized = profileData.baptized
        body.maisonGrace = profileData.maisonGrace
        body.profileImageUrl = profileData.profileImageUrl
      }
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (res.ok) {
        // ✅ Mettre à jour l'utilisateur sans recharger la page
        await refreshUser()
        toast.success('Profil mis à jour avec succès !')
        // ✅ Fermer le profil et revenir au dashboard
        onClose()
      } else { 
        toast.error(data.error || 'Erreur lors de la mise à jour') 
      }
    } catch (error) { 
      toast.error('Erreur lors de la mise à jour du profil') 
    } finally { 
      setLoadingUpdate(false) 
    }
  }

  const handlePasswordUpdate = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) { 
      toast.error('Tous les champs sont requis')
      return 
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) { 
      toast.error('Les mots de passe ne correspondent pas')
      return 
    }
    if (passwordData.newPassword.length < 6) { 
      toast.error('Le mot de passe doit contenir au moins 6 caractères')
      return 
    }
    setLoadingUpdate(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ 
          currentPassword: passwordData.currentPassword, 
          newPassword: passwordData.newPassword 
        })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Mot de passe mis à jour')
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        toast.info('Vous allez être redirigé vers la page de connexion')
        setTimeout(() => {
          localStorage.removeItem('token')
          window.location.href = '/login'
        }, 2000)
      } else { 
        toast.error(data.error || 'Erreur lors du changement de mot de passe') 
      }
    } catch (error) { 
      toast.error('Erreur lors du changement de mot de passe') 
    } finally { 
      setLoadingUpdate(false) 
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
      {/* Fond */}
      <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
      <div className="absolute inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.92) 0%, rgba(15,45,130,0.88) 40%, rgba(10,30,100,0.9) 70%, rgba(4,12,65,0.95) 100%)' }} />
      
      <div className="relative z-30 max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="flex items-center text-blue-200/80 hover:text-white transition-colors text-sm">
            <ArrowLeftIcon className="w-4 h-4 mr-2" /> Retour au tableau de bord
          </button>
          <h1 className="text-2xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Mon profil</h1>
        </div>

        {/* Carte info utilisateur */}
        <div className="bg-white/[0.06] backdrop-blur-3xl border border-white/[0.12] rounded-2xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative">
              {profileData.profileImageUrl ? (
                <img src={profileData.profileImageUrl} alt="Photo" className="w-28 h-28 rounded-full object-cover border-4 border-white/20" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/20">
                  <span className="text-4xl font-bold text-white/60">{profileData.name?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
              )}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-semibold text-white">{profileData.name}</h2>
              <p className="text-blue-200/70 text-sm">{getRoleLabel()}</p>
              <p className="text-blue-200/50 text-sm">@{profileData.username}</p>
              {user?.role === 'student' && (
                <>
                  <p className="text-blue-200/70 text-sm mt-1">Niveau {user?.level || 1}</p>
                  {profileData.maisonGrace && <p className="text-blue-200/60 text-sm">🏠 {profileData.maisonGrace}</p>}
                </>
              )}
              
              {/* ✅ Version corrigée du bouton d'upload */}
              <div className="flex gap-2 mt-3 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => {
                    console.log('🖱️ Bouton upload cliqué');
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/jpeg,image/jpg,image/png,image/webp';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      console.log('📸 Fichier sélectionné:', file?.name);
                      if (!file) return;
                      
                      // Validation
                      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                      if (!allowedTypes.includes(file.type)) { 
                        toast.error('Format non autorisé'); 
                        return; 
                      }
                      if (file.size > 5 * 1024 * 1024) { 
                        toast.error('Image trop volumineuse (max 5 MB)'); 
                        return; 
                      }
                      
                      setUploadingPhoto(true);
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const token = localStorage.getItem('token');
                        console.log('🔑 Token présent:', !!token);
                        
                        const res = await fetch('/api/profile/upload-photo', { 
                          method: 'POST', 
                          headers: {
                            'Authorization': `Bearer ${token}`
                          },
                          body: formData 
                        });
                        
                        const data = await res.json();
                        console.log('📸 Réponse serveur:', data);
                        
                        if (res.ok) {
                          setProfileData({ ...profileData, profileImageUrl: data.url });
                          toast.success('Photo mise à jour !');
                        } else { 
                          toast.error(data.error || 'Erreur upload'); 
                        }
                      } catch (error) { 
                        console.error('Erreur upload:', error);
                        toast.error('Erreur réseau'); 
                      } finally { 
                        setUploadingPhoto(false); 
                      }
                    };
                    input.click();
                  }}
                  disabled={uploadingPhoto}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20 transition-colors"
                >
                  <CameraIcon className="w-3.5 h-3.5" />
                  {uploadingPhoto ? 'Upload...' : (profileData.profileImageUrl ? 'Changer' : 'Ajouter photo')}
                </button>
                
                {profileData.profileImageUrl && (
                  <button onClick={handlePhotoDelete} disabled={uploadingPhoto} 
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-xs hover:bg-red-500/30 transition-colors">
                    <TrashIcon className="w-3.5 h-3.5" /> Supprimer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 mb-6 border-b border-white/10">
          {[
            { key: 'profile', icon: UserCircleIcon, label: 'Profil' },
            { key: 'security', icon: KeyIcon, label: 'Sécurité' }
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === tab.key ? 'border-white text-white' : 'border-transparent text-white/50 hover:text-white/80'
              }`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Onglet Profil */}
        {activeTab === 'profile' && (
          <div className="bg-white/[0.06] backdrop-blur-3xl border border-white/[0.12] rounded-2xl p-6">
            <h3 className="text-lg font-normal text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Informations personnelles</h3>
            <p className="text-blue-200/60 text-xs mb-6">Mettez à jour vos informations personnelles</p>
            <div className="space-y-4">
              <input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400" />
              <input type="text" value={profileData.username} onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400" />
              <input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} placeholder="Email (optionnel)"
                className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400" />
              
              {user?.role === 'student' && (
                <>
  <input type="tel" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} placeholder="Téléphone"
    className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400" />
  
  {/* ✅ Champ baptême à ajouter ici */}
  <div>
    <label className="block text-sm text-white/70 mb-2">Baptême</label>
    <div className="flex gap-6">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="baptized"
          checked={profileData.baptized === true}
          onChange={() => setProfileData({ ...profileData, baptized: true })}
          className="w-4 h-4 accent-indigo-500"
        />
        <span className="text-white/80 text-sm">✅ Baptisé(e)</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="baptized"
          checked={profileData.baptized === false}
          onChange={() => setProfileData({ ...profileData, baptized: false })}
          className="w-4 h-4 accent-indigo-500"
        />
        <span className="text-white/80 text-sm">❌ Non baptisé(e)</span>
      </label>
    </div>
  </div>
  
  <input type="text" value={profileData.maisonGrace} onChange={(e) => setProfileData({ ...profileData, maisonGrace: e.target.value })} placeholder="Maison de grâce (optionnel)"
    className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400" />
</>
              )}
              
              <div className="flex justify-end pt-2">
                <button onClick={handleProfileUpdate} disabled={loadingUpdate}
                  className="bg-white text-[#1a3a8f] px-6 py-2.5 rounded-lg text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
                  style={{ fontFamily: "'Crimson Text', serif" }}>
                  {loadingUpdate ? 'Mise à jour...' : '💾 Enregistrer les modifications'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Onglet Sécurité */}
        {activeTab === 'security' && (
          <div className="bg-white/[0.06] backdrop-blur-3xl border border-white/[0.12] rounded-2xl p-6">
            <h3 className="text-lg font-normal text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Modifier le mot de passe</h3>
            <p className="text-blue-200/60 text-xs mb-6">Choisissez un mot de passe sécurisé</p>
            <div className="space-y-4 max-w-md">
              <div className="relative">
                <input type={showCurrentPassword ? 'text' : 'password'} value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} placeholder="Mot de passe actuel"
                  className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm pr-10 focus:outline-none focus:border-indigo-400" />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showCurrentPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <input type={showNewPassword ? 'text' : 'password'} value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} placeholder="Nouveau mot de passe (min 6)"
                  className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm pr-10 focus:outline-none focus:border-indigo-400" />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showNewPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} placeholder="Confirmer le mot de passe"
                  className="w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm pr-10 focus:outline-none focus:border-indigo-400" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showConfirmPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              {passwordData.newPassword && passwordData.confirmPassword && (
                <p className={`text-xs ${passwordData.newPassword === passwordData.confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                  {passwordData.newPassword === passwordData.confirmPassword ? '✅ Les mots de passe correspondent' : '❌ Les mots de passe ne correspondent pas'}
                </p>
              )}
              <div className="flex justify-end pt-2">
                <button onClick={handlePasswordUpdate} disabled={loadingUpdate}
                  className="bg-white text-[#1a3a8f] px-6 py-2.5 rounded-lg text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50"
                  style={{ fontFamily: "'Crimson Text', serif" }}>
                  {loadingUpdate ? 'Mise à jour...' : 'Changer le mot de passe'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
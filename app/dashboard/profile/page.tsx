'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { UserCircleIcon, KeyIcon } from '@heroicons/react/24/outline'

export default function ProfilePage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('profile')
  const [loadingUpdate, setLoadingUpdate] = useState(false)
  
  const [profileData, setProfileData] = useState({ name: '', username: '', email: '', phone: '' })

  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user) setProfileData({ name: user.name || '', username: user.username || '', email: user.email || '', phone: user.phone || '' })
  }, [user, loading])

  const handleProfileUpdate = async () => {
    if (!profileData.name || !profileData.username) { toast.error('Le nom et le nom d\'utilisateur sont requis'); return }
    setLoadingUpdate(true)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(profileData)
      })
      const data = await res.json()
      if (res.ok) { toast.success('Profil mis à jour avec succès'); setTimeout(() => window.location.reload(), 1500) }
      else toast.error(data.error || 'Erreur lors de la mise à jour')
    } catch (error) { toast.error('Erreur lors de la mise à jour du profil') }
    finally { setLoadingUpdate(false) }
  }

  const handlePasswordUpdate = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) { toast.error('Tous les champs sont requis'); return }
    if (passwordData.newPassword !== passwordData.confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return }
    if (passwordData.newPassword.length < 6) { toast.error('Le mot de passe doit contenir au moins 6 caractères'); return }
    setLoadingUpdate(true)
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Mot de passe mis à jour avec succès')
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => { logout(); router.push('/login') }, 2000)
      } else toast.error(data.error || 'Erreur lors du changement de mot de passe')
    } catch (error) { toast.error('Erreur lors du changement de mot de passe') }
    finally { setLoadingUpdate(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a1a5a 0%, #0f2d82 50%, #0a1e64 100%)' }}><div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return null

  const inputClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"

  return (
    <div className="min-h-screen relative" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
      <div className="fixed inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/ok.png')" }} />
      <div className="fixed inset-0 z-10" style={{ background: 'linear-gradient(135deg, rgba(8,20,90,0.92) 0%, rgba(15,45,130,0.88) 40%, rgba(10,30,100,0.9) 70%, rgba(4,12,65,0.95) 100%)' }} />
      
      <div className="relative z-30">
        {/* Header */}
        <div className="bg-[rgba(5,15,70,0.6)] backdrop-blur-2xl border-b border-white/[0.08]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h1 className="text-2xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Paramètres du compte</h1>
              </div>
              <button onClick={logout} className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-xs hover:bg-red-500/30 transition-colors">Déconnexion</button>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Info user */}
          <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-white/60">{profileData.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{profileData.name}</h2>
                <p className="text-white/50 text-sm capitalize">{user?.role === 'superadmin' ? 'Administrateur' : user?.role === 'service_manager' ? 'Responsable de service' : 'Étudiant'}</p>
                <p className="text-white/40 text-sm">@{profileData.username}</p>
              </div>
            </div>
          </div>

          {/* Onglets */}
          <div className="flex gap-1 mb-6 border-b border-white/[0.08]">
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

          {/* Profil */}
          {activeTab === 'profile' && (
            <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-6">
              <h3 className="text-lg font-normal text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Informations personnelles</h3>
              <p className="text-white/50 text-xs mb-6">Mettez à jour vos informations personnelles</p>
              <div className="space-y-4">
                <div><label className="block text-sm text-white/70 mb-1">Nom complet</label><input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm text-white/70 mb-1">Nom d'utilisateur</label><input type="text" value={profileData.username} onChange={(e) => setProfileData({ ...profileData, username: e.target.value })} className={inputClass} /></div>
                <div><label className="block text-sm text-white/70 mb-1">Email</label><input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} placeholder="exemple@email.com" className={inputClass} /></div>
                {user?.role === 'student' && (
                  <div><label className="block text-sm text-white/70 mb-1">Téléphone</label><input type="tel" value={profileData.phone} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} placeholder="0700000000" className={inputClass} /></div>
                )}
                <div className="flex justify-end pt-2">
                  <button onClick={handleProfileUpdate} disabled={loadingUpdate}
                    className="px-6 py-2.5 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50" style={{ fontFamily: "'Crimson Text', serif" }}>
                    {loadingUpdate ? 'Mise à jour...' : 'Enregistrer les modifications'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sécurité */}
          {activeTab === 'security' && (
            <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-6">
              <h3 className="text-lg font-normal text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Modifier le mot de passe</h3>
              <p className="text-white/50 text-xs mb-6">Choisissez un mot de passe sécurisé que vous n'utilisez pas ailleurs</p>
              <div className="space-y-4 max-w-md">
                <div><label className="block text-sm text-white/70 mb-1">Mot de passe actuel</label><input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} placeholder="Votre mot de passe actuel" className={inputClass} /></div>
                <div><label className="block text-sm text-white/70 mb-1">Nouveau mot de passe</label><input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} placeholder="Minimum 6 caractères" className={inputClass} /></div>
                <div><label className="block text-sm text-white/70 mb-1">Confirmer le nouveau mot de passe</label><input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} placeholder="Retapez votre nouveau mot de passe" className={inputClass} /></div>
                {passwordData.newPassword && passwordData.confirmPassword && (
                  <p className={`text-xs ${passwordData.newPassword === passwordData.confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                    {passwordData.newPassword === passwordData.confirmPassword ? '✅ Les mots de passe correspondent' : '❌ Les mots de passe ne correspondent pas'}
                  </p>
                )}
                <div className="flex justify-end pt-2">
                  <button onClick={handlePasswordUpdate} disabled={loadingUpdate}
                    className="px-6 py-2.5 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50" style={{ fontFamily: "'Crimson Text', serif" }}>
                    {loadingUpdate ? 'Mise à jour...' : 'Changer le mot de passe'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
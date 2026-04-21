'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { UserCircleIcon, KeyIcon, ArrowLeftIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface ProfileSectionProps {
  user: any
  onClose: () => void
}

export const ProfileSection = ({ user, onClose }: ProfileSectionProps) => {
  const [activeTab, setActiveTab] = useState('profile')
  const [loadingUpdate, setLoadingUpdate] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // États pour le profil
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    baptized: user?.baptized === true || user?.baptized === 'true' || false
  })

  // États pour le mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const getRoleLabel = () => {
    if (user?.role === 'superadmin') return 'Administrateur'
    if (user?.role === 'service_manager') return 'Responsable de service'
    return 'Étudiant'
  }

  const handleProfileUpdate = async () => {
    if (!profileData.name || !profileData.username) {
      toast.error('Le nom et le nom d\'utilisateur sont requis')
      return
    }

    setLoadingUpdate(true)
    try {
      const body: any = {
        name: profileData.name,
        username: profileData.username,
        email: profileData.email
      }

      // Ajouter le téléphone et baptême seulement pour les étudiants
      if (user?.role === 'student') {
        body.phone = profileData.phone
        body.baptized = profileData.baptized
      }

      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Profil mis à jour avec succès')
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        toast.error(data.error || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Erreur:', error)
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
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Mot de passe mis à jour avec succès')
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        
        setTimeout(() => {
          localStorage.removeItem('token')
          window.location.href = '/login'
          toast.info('Veuillez vous reconnecter avec votre nouveau mot de passe')
        }, 2000)
      } else {
        toast.error(data.error || 'Erreur lors du changement de mot de passe')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du changement de mot de passe')
    } finally {
      setLoadingUpdate(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header avec bouton retour */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onClose}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Retour au tableau de bord
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
      </div>

      {/* Informations utilisateur */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-indigo-600">
                {profileData.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{profileData.name}</h2>
              <p className="text-sm text-gray-500 capitalize">{getRoleLabel()}</p>
              <p className="text-sm text-gray-500">@{profileData.username}</p>
              {user?.role === 'student' && (
                <p className="text-sm text-gray-500 mt-1">Niveau {user?.level || 1}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets */}
      <div className="flex space-x-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <UserCircleIcon className="w-4 h-4" />
            Profil
          </div>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <KeyIcon className="w-4 h-4" />
            Sécurité
          </div>
        </button>
      </div>

      {/* Contenu - Profil */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Mettez à jour vos informations personnelles
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    placeholder="exemple@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                  <p className="text-xs text-gray-400 mt-1">Optionnel</p>
                </div>

                {/* Section étudiant uniquement */}
                {user?.role === 'student' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder="0700000000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Statut de baptême
                      </label>
                      <select
                        value={profileData.baptized ? 'true' : 'false'}
                        onChange={(e) => setProfileData({ ...profileData, baptized: e.target.value === 'true' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      >
                        <option value="false">Non baptisé</option>
                        <option value="true">Baptisé</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleProfileUpdate}
                  disabled={loadingUpdate}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {loadingUpdate ? 'Mise à jour...' : 'Enregistrer les modifications'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contenu - Sécurité (Changement de mot de passe) */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle>Modifier le mot de passe</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Choisissez un mot de passe sécurisé que vous n'utilisez pas ailleurs
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 max-w-md">
              {/* Mot de passe actuel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 pr-10"
                    placeholder="Votre mot de passe actuel"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Nouveau mot de passe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 pr-10"
                    placeholder="Minimum 6 caractères"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
              </div>

              {/* Confirmation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 pr-10"
                    placeholder="Retapez votre nouveau mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Indicateur de correspondance */}
              {passwordData.newPassword && passwordData.confirmPassword && (
                <div className="text-sm">
                  {passwordData.newPassword === passwordData.confirmPassword ? (
                    <span className="text-green-600 flex items-center gap-1">
                      ✅ Les mots de passe correspondent
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      ❌ Les mots de passe ne correspondent pas
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handlePasswordUpdate}
                  disabled={loadingUpdate}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {loadingUpdate ? 'Mise à jour...' : 'Changer le mot de passe'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
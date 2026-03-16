'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { UserCircleIcon, KeyIcon } from '@heroicons/react/24/outline'

export default function ProfilePage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('profile')
  const [loadingUpdate, setLoadingUpdate] = useState(false)
  
  // États pour le profil
  const [profileData, setProfileData] = useState({
    name: '',
    username: '',
    email: '',
    phone: ''
  })

  // États pour le mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    if (user) {
      setProfileData({
        name: user.name || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || ''
      })
    }
  }, [user, loading])

  const handleProfileUpdate = async () => {
    if (!profileData.name || !profileData.username) {
      toast.error('Le nom et le nom d\'utilisateur sont requis')
      return
    }

    setLoadingUpdate(true)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profileData)
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
          logout()
          router.push('/login')
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

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header avec bouton retour */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Paramètres du compte</h1>
            </div>
            <Button onClick={logout} variant="destructive" size="sm">
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
                <p className="text-sm text-gray-500 capitalize">
                  {user?.role === 'superadmin' ? 'Administrateur' : 
                   user?.role === 'service_manager' ? 'Responsable de service' : 'Étudiant'}
                </p>
                <p className="text-sm text-gray-500">@{profileData.username}</p>
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
            Profil
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Sécurité
          </button>
        </div>

        {/* Contenu */}
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {user?.role === 'student' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mot de passe actuel
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end">
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
    </div>
  )
}
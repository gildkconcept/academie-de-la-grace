'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressChart } from '@/components/charts'
import { toast } from 'sonner'
import { Attendance, Progress } from '@/types'

export default function StudentDashboard() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [showCodeInput, setShowCodeInput] = useState(false)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
    if (user?.role === 'service_manager') {
      router.push('/dashboard/manager')
    }
    if (user?.role === 'superadmin') {
      router.push('/dashboard/superadmin')
    }
    if (user?.id) {
      fetchData()
    }
  }, [user, loading])

  const fetchData = async () => {
    setLoadingData(true)
    try {
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*, sessions(*)')
        .eq('student_id', user?.id)
        .order('date', { ascending: false })
        .limit(10)

      if (attendanceData) {
        setAttendance(attendanceData)
      }

      const { data: progressData } = await supabase
        .from('progress')
        .select('*')
        .eq('student_id', user?.id)

      if (progressData) {
        setProgress(progressData)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoadingData(false)
    }
  }

  const verifyCode = async () => {
    if (code.length !== 6) {
      toast.error('Le code doit faire 6 chiffres')
      return
    }

    setVerifying(true)
    try {
      const res = await fetch('/api/code/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('✅ Présence enregistrée !')
        setShowCodeInput(false)
        setCode('')
        fetchData()
      } else {
        toast.error(data.error || 'Code invalide')
      }
    } catch (error) {
      toast.error('Erreur lors de la vérification')
    } finally {
      setVerifying(false)
    }
  }

  const calculateProgress = () => {
    if (progress.length === 0) return 0
    const total = progress.reduce((acc, p) => acc + (p.score || 0), 0)
    return Math.round(total / progress.length)
  }

  if (loading || loadingData) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Mon Espace Étudiant</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.name}</span>
              <Button onClick={logout} variant="destructive">
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Statistiques personnelles */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500">Présences totales</div>
              <div className="mt-2 text-3xl font-semibold text-green-600">
                {attendance.filter(a => a.status === 'present').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500">Progression académique</div>
              <div className="mt-2 text-3xl font-semibold text-blue-600">{calculateProgress()}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-gray-500">Modules complétés</div>
              <div className="mt-2 text-3xl font-semibold text-purple-600">
                {progress.filter(p => p.completed).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graphique de progression */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Ma progression académique</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressChart data={progress.map(p => ({
              name: p.module,
              progress: p.score
            }))} />
          </CardContent>
        </Card>

        {/* Historique des présences */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Historique des présences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heure</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendance.map((a) => (
                    <tr key={a.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(a.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          a.status === 'present' 
                            ? 'bg-green-100 text-green-800'
                            : a.status === 'late'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {a.status === 'present' ? 'Présent' : a.status === 'late' ? 'En retard' : 'Absent'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {a.scanned_at ? new Date(a.scanned_at).toLocaleTimeString('fr-FR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanner Section - Code Input */}
      {!showCodeInput ? (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4">
          <button
            onClick={() => setShowCodeInput(true)}
            className="w-full bg-indigo-600 text-white py-4 px-8 rounded-full shadow-lg hover:bg-indigo-700 active:bg-indigo-800 transition-all duration-200 text-lg font-semibold flex items-center justify-center space-x-3"
          >
            <span className="text-2xl">🔑</span>
            <span>Entrer le code de présence</span>
          </button>
          <p className="text-center text-sm text-gray-500 mt-2">
            Entrez le code à 6 chiffres affiché par votre responsable
          </p>
        </div>
      ) : (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">🔑 Code de présence</h3>
            
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full text-center text-4xl font-bold p-4 border-2 border-indigo-300 rounded-lg mb-4 tracking-widest"
              autoFocus
            />
            
            <div className="flex space-x-3">
              <button
                onClick={verifyCode}
                disabled={verifying || code.length !== 6}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {verifying ? 'Vérification...' : 'Valider ma présence'}
              </button>
              <button
                onClick={() => {
                  setShowCodeInput(false)
                  setCode('')
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-medium"
              >
                Annuler
              </button>
            </div>
            
            <p className="text-sm text-gray-500 text-center mt-4">
              ⏰ Le code expire après 5 minutes
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
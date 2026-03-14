'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { QRScannerComponent as QRScanner } from '@/components/qr-scanner'
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
  const [showScanner, setShowScanner] = useState(false)
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
      // Récupérer l'historique des présences
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*, sessions(*)')
        .eq('student_id', user?.id)
        .order('date', { ascending: false })
        .limit(10)

      if (attendanceData) {
        setAttendance(attendanceData)
      }

      // Récupérer la progression académique
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

  const handleScan = async (qrData: string) => {
    try {
      // Extraire les paramètres de l'URL scannée
      const url = new URL(qrData)
      const token = url.searchParams.get('token')
      const sessionId = url.searchParams.get('session')

      if (!token || !sessionId) {
        toast.error('QR code invalide')
        setShowScanner(false)
        return
      }

      const res = await fetch('/api/qrcode/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sessionId,
          token
        })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Présence enregistrée avec succès !')
        setShowScanner(false)
        fetchData() // Rafraîchir les données
      } else {
        toast.error(data.error || 'Erreur lors de l\'enregistrement')
      }
    } catch (error) {
      console.error('Erreur scan:', error)
      toast.error('Erreur lors du scan')
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
    <div className="min-h-screen bg-gray-100">
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
        {/* Scanner QR Code */}
        <div className="mb-8">
          {!showScanner ? (
            <Button onClick={() => setShowScanner(true)} size="lg">
              Scanner QR Code pour marquer ma présence
            </Button>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium mb-4">Scannez le QR code de la session</h2>
              <QRScanner onScan={handleScan} onError={(err) => toast.error(err)} />
              <Button 
                onClick={() => setShowScanner(false)} 
                variant="outline" 
                className="mt-4"
              >
                Annuler
              </Button>
            </div>
          )}
        </div>

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
        <Card>
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
    </div>
  )
}
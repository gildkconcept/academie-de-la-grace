'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ScanPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')

  const token = searchParams.get('token')
  const sessionId = searchParams.get('session')

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    const userToken = localStorage.getItem('token')
    if (!userToken) {
      // Rediriger vers login avec un return URL
      router.push(`/login?redirect=/scan?token=${token}&session=${sessionId}`)
    }
  }, [router, token, sessionId])

  const handleConfirmPresence = async () => {
    setProcessing(true)
    try {
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
        setMessage('Présence enregistrée avec succès !')
        toast.success('Présence confirmée')
        setTimeout(() => router.push('/dashboard/student'), 2000)
      } else {
        setMessage(data.error || 'Erreur lors de l\'enregistrement')
        toast.error(data.error)
      }
    } catch (error) {
      setMessage('Erreur lors de la confirmation')
      toast.error('Erreur')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Confirmation de présence</CardTitle>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="text-center">
              <p className="text-lg mb-4">{message}</p>
              {!message.includes('succès') && (
                <Button onClick={() => router.push('/dashboard/student')}>
                  Retour au tableau de bord
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="mb-6">
                Voulez-vous confirmer votre présence pour cette session ?
              </p>
              <Button
                onClick={handleConfirmPresence}
                disabled={processing}
                size="lg"
                className="w-full"
              >
                {processing ? 'Traitement...' : 'Confirmer ma présence'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
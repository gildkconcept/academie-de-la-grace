'use client'

import { useState, useEffect } from 'react'
import { Scanner, IDetectedBarcode } from '@yudiel/react-qr-scanner'
import { toast } from 'sonner'

interface QRScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
}

export const QRScanner = ({ onScan, onError }: QRScannerProps) => {
  const [isActive, setIsActive] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    if (isActive) {
      checkCameraPermission()
    }
  }, [isActive])

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(track => track.stop())
      setHasPermission(true)
    } catch (err) {
      setHasPermission(false)
      toast.error('Accès caméra refusé. Activez la caméra dans les paramètres.')
    }
  }

  // CORRECTION ICI : le paramètre est un tableau de IDetectedBarcode
  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      // Prendre le premier code détecté
      const result = detectedCodes[0].rawValue
      onScan(result)
      setIsActive(false)
      toast.success('✅ Présence enregistrée !')
    }
  }

  const handleError = (error: any) => {
    console.error('Erreur scan:', error)
    if (onError) onError('Erreur lors du scan')
    toast.error('Erreur de scan. Réessayez.')
  }

  const startScan = () => setIsActive(true)
  const stopScan = () => {
    setIsActive(false)
    setHasPermission(null)
  }

  if (!isActive) {
    return (
      <>
        <button
          onClick={startScan}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white py-4 px-8 rounded-full shadow-lg hover:bg-indigo-700 active:bg-indigo-800 transition-all duration-200 text-lg font-semibold flex items-center space-x-3 z-50"
          style={{
            boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)',
            minWidth: '250px',
            justifyContent: 'center'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Scanner un QR Code</span>
        </button>
        <p className="fixed bottom-28 left-0 right-0 text-center text-sm text-gray-500">
          Pointez votre téléphone vers le QR code du responsable
        </p>
      </>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={stopScan} className="text-white bg-black/30 backdrop-blur p-2 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 className="text-white font-semibold">Scanner un QR Code</h3>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 relative">
        {hasPermission === false ? (
          <div className="h-full flex flex-col items-center justify-center text-white p-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <p className="text-lg font-medium text-center mb-4">Accès caméra requis</p>
            <p className="text-sm text-gray-300 text-center mb-6">
              Pour scanner le QR code, veuillez autoriser l'accès à la caméra dans les paramètres de votre téléphone.
            </p>
            <button onClick={stopScan} className="bg-white text-black px-6 py-3 rounded-lg font-medium">
              Retour
            </button>
          </div>
        ) : (
          <>
            <Scanner
              onScan={handleScan}
              onError={handleError}
              styles={{
                container: { width: '100%', height: '100%' },
                video: { objectFit: 'cover' }
              }}
            />
            
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/50"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                <div className="absolute inset-0 border-4 border-indigo-500 rounded-2xl"></div>
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-2xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-2xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-2xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-2xl"></div>
                <div className="absolute left-0 right-0 h-0.5 bg-indigo-500 animate-scan"></div>
              </div>
              <div className="absolute bottom-12 left-0 right-0 text-center">
                <p className="text-white text-sm bg-black/30 backdrop-blur inline-block px-4 py-2 rounded-full">
                  Placez le QR code dans le cadre
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 flex justify-center">
        <button onClick={stopScan} className="bg-white/20 backdrop-blur text-white px-8 py-3 rounded-full font-medium">
          Annuler
        </button>
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface QRScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
}

export const QRScanner = ({ onScan, onError }: QRScannerProps) => {
  const [scanning, setScanning] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue) {
      try {
        // Vérifier si c'est une URL valide
        new URL(inputValue)
        onScan(inputValue)
        setInputValue('')
        setScanning(false)
      } catch (err) {
        toast.error('Veuillez entrer un lien de QR code valide')
        if (onError) onError('URL invalide')
      }
    }
  }

  if (!scanning) {
    return (
      <button
        onClick={() => setScanning(true)}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
      >
        Scanner un QR Code
      </button>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">Scannez le QR code</h3>
      <p className="text-sm text-gray-600 mb-4">
        Utilisez l'appareil photo de votre téléphone pour scanner le QR code affiché par votre responsable,
        ou entrez manuellement le lien du QR code ci-dessous.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="qrInput" className="block text-sm font-medium text-gray-700 mb-2">
            Lien du QR code
          </label>
          <input
            type="url"
            id="qrInput"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Collez le lien du QR code ici"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            type="submit"
            className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Confirmer
          </button>
          <button
            type="button"
            onClick={() => setScanning(false)}
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
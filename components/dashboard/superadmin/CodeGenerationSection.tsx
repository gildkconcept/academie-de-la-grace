// components/dashboard/superadmin/CodeGenerationSection.tsx
'use client'

import { sessionService } from '@/services/sessionService'
import { toast } from 'sonner'

interface CodeGenerationSectionProps {
  selectedGenerationLevel: string
  setSelectedGenerationLevel: (level: string) => void
  generatingCode: boolean
  setGeneratingCode: (loading: boolean) => void
  user: any
}

export const CodeGenerationSection = ({
  selectedGenerationLevel,
  setSelectedGenerationLevel,
  generatingCode,
  setGeneratingCode,
  user
}: CodeGenerationSectionProps) => {
  
  const generateCode = async () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée')
      return
    }

    setGeneratingCode(true)
    toast.loading('Récupération de votre position...', { id: 'loc' })

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        toast.dismiss('loc')
        const { latitude, longitude } = position.coords
        const level = selectedGenerationLevel === 'all' ? null : parseInt(selectedGenerationLevel)

        try {
          toast.loading('Génération du code...', { id: 'gen' })
          
          const response = await sessionService.generateCode(latitude, longitude, 200, level)
          
          toast.dismiss('gen')
          
          if (response.code) {
            const codeDisplay = document.querySelector('#codeDisplay')
            if (codeDisplay) codeDisplay.textContent = response.code
            
            toast.success(`Code ${response.code} généré - Valable 15 min`)
            
            setTimeout(() => {
              if (codeDisplay) codeDisplay.textContent = '— — — —'
            }, 15000)
          } else {
            toast.error(response.error || 'Erreur lors de la génération')
          }
        } catch (error: any) {
          toast.dismiss('gen')
          toast.error(error.response?.data?.error || 'Erreur serveur')
        } finally {
          setGeneratingCode(false)
        }
      },
      (error) => {
        toast.dismiss('loc')
        setGeneratingCode(false)
        let message = 'Impossible d\'obtenir votre position'
        if (error.code === error.PERMISSION_DENIED) {
          message = '❌ Activez la localisation'
        } else if (error.code === error.TIMEOUT) {
          message = 'Délai dépassé'
        }
        toast.error(message)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="codegen-box">
      <h3>🎯 Génération du code de présence académique</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '8px' }}>
          🎯 Niveau cible
        </label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: '🌍 Tous niveaux (universel)' },
            { value: '1', label: '📚 Niveau 1 uniquement' },
            { value: '2', label: '📚 Niveau 2 uniquement' },
            { value: '3', label: '📚 Niveau 3 uniquement' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedGenerationLevel(option.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '24px',
                fontSize: '12px',
                cursor: 'pointer',
                background: selectedGenerationLevel === option.value 
                  ? 'rgba(99, 102, 241, 0.25)' 
                  : 'rgba(255, 255, 255, 0.06)',
                color: selectedGenerationLevel === option.value 
                  ? '#a5b4fc' 
                  : 'rgba(255, 255, 255, 0.55)',
                border: selectedGenerationLevel === option.value 
                  ? '1px solid rgba(99, 102, 241, 0.4)' 
                  : '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="code-display" id="codeDisplay">
        — — — —
      </div>
      
      <p style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '10px', marginBottom: '20px' }}>
        📍 Votre position sera enregistrée. Rayon : 200 mètres.
      </p>
      
      <button 
        onClick={generateCode} 
        disabled={generatingCode}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          background: generatingCode ? '#15803d' : '#16a34a',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          padding: '14px 28px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: generatingCode ? 'not-allowed' : 'pointer',
          opacity: generatingCode ? 0.7 : 1
        }}
      >
        <span>📍</span>
        <span>{generatingCode ? 'GÉNÉRATION EN COURS...' : 'GÉNÉRER LE CODE AVEC MA POSITION'}</span>
      </button>
    </div>
  )
}
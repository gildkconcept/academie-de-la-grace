'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface LevelSelectorProps {
  studentId: string
  currentLevel: number
  studentName: string
  onLevelChanged?: () => void
}

export const LevelSelector = ({ studentId, currentLevel, studentName, onLevelChanged }: LevelSelectorProps) => {
  const [selectedLevel, setSelectedLevel] = useState<number>(currentLevel)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleLevelChange = async () => {
    if (selectedLevel === currentLevel) {
      toast.info('Le niveau n\'a pas changé')
      setIsOpen(false)
      return
    }

    if (!confirm(`⚠️ Confirmer le changement de niveau pour ${studentName} ?\n\nNiveau actuel : ${currentLevel}\nNouveau niveau : ${selectedLevel}`)) {
      setSelectedLevel(currentLevel)
      setIsOpen(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/students/${studentId}/level`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',  // ← Correction des guillemets
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ level: selectedLevel })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || 'Niveau mis à jour avec succès')
        if (onLevelChanged) onLevelChanged()
        setIsOpen(false)
      } else {
        toast.error(data.error || 'Erreur lors de la mise à jour')
        setSelectedLevel(currentLevel)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur serveur')
      setSelectedLevel(currentLevel)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Niveau :</span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 flex items-center gap-2"
        >
          {selectedLevel}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 bg-white border rounded-lg shadow-lg min-w-[120px]">
          <div className="p-2 space-y-1">
            {[1, 2, 3].map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  selectedLevel === level
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                Niveau {level}
              </button>
            ))}
            <div className="border-t pt-2 mt-1">
              <Button
                size="sm"
                onClick={handleLevelChange}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {loading ? 'Mise à jour...' : 'Appliquer'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsOpen(false)
                  setSelectedLevel(currentLevel)
                }}
                className="w-full mt-1"
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
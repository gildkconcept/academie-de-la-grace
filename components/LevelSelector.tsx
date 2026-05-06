'use client'

import { useState } from 'react'
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
    if (selectedLevel === currentLevel) { toast.info('Le niveau n\'a pas changé'); setIsOpen(false); return }
    if (!confirm(`⚠️ Confirmer le changement de niveau pour ${studentName} ?\n\nNiveau actuel : ${currentLevel}\nNouveau niveau : ${selectedLevel}`)) {
      setSelectedLevel(currentLevel); setIsOpen(false); return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/students/${studentId}/level`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ level: selectedLevel })
      })
      const data = await res.json()
      if (res.ok) { toast.success(data.message || 'Niveau mis à jour'); if (onLevelChanged) onLevelChanged(); setIsOpen(false) }
      else { toast.error(data.error || 'Erreur lors de la mise à jour'); setSelectedLevel(currentLevel) }
    } catch (error) { toast.error('Erreur serveur'); setSelectedLevel(currentLevel) }
    finally { setLoading(false) }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/60">Niveau :</span>
        <button onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1 text-sm bg-white/10 border border-white/20 rounded-lg text-white/80 hover:bg-white/20 transition-colors flex items-center gap-2">
          {selectedLevel}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 bg-[rgba(8,20,90,0.97)] backdrop-blur-2xl border border-white/[0.15] rounded-xl shadow-lg min-w-[120px] overflow-hidden">
          <div className="p-2 space-y-1">
            {[1, 2, 3].map((level) => (
              <button key={level} onClick={() => setSelectedLevel(level)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                  selectedLevel === level ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}>
                Niveau {level}
              </button>
            ))}
            <div className="border-t border-white/[0.1] pt-2 mt-1 space-y-1">
              <button onClick={handleLevelChange} disabled={loading}
                className="w-full py-1.5 bg-white text-[#1a3a8f] rounded-lg text-xs font-bold hover:shadow-lg transition-all disabled:opacity-50">
                {loading ? 'Mise à jour...' : 'Appliquer'}
              </button>
              <button onClick={() => { setIsOpen(false); setSelectedLevel(currentLevel) }}
                className="w-full py-1.5 bg-white/10 text-white/60 rounded-lg text-xs hover:bg-white/20 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
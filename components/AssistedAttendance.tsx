'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface Student {
  id: string
  full_name: string
  branch: string
  level: number
  status?: 'present' | 'absent'
}

interface AssistedAttendanceProps {
  sessionId: string
  sessionCode?: string
  onComplete?: () => void
}

export const AssistedAttendance = ({ sessionId, sessionCode, onComplete }: AssistedAttendanceProps) => {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectAll, setSelectAll] = useState(false)

  useEffect(() => {
    fetchStudents()
  }, [sessionId])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance/assisted?sessionId=${sessionId}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur chargement étudiants')
    } finally {
      setLoading(false)
    }
  }

  const toggleStudent = (studentId: string) => {
    setStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, status: s.status === 'present' ? 'absent' : 'present' } : s
    ))
  }

  const toggleSelectAll = () => {
    const newStatus = !selectAll
    setSelectAll(newStatus)
    setStudents(prev => prev.map(s => ({ ...s, status: newStatus ? 'present' : 'absent' })))
  }

  const saveAttendances = async () => {
    setSaving(true)
    try {
      const attendances = students.map(s => ({ studentId: s.id, status: s.status || 'absent' }))
      const res = await fetch('/api/attendance/assisted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId, attendances })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Présences enregistrées')
        if (onComplete) onComplete()
      } else {
        toast.error(data.error || 'Erreur')
      }
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const presentCount = students.filter(s => s.status === 'present').length
  const totalCount = students.length
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

  if (loading) {
    return <div className="text-center py-8 text-white/60">Chargement des étudiants...</div>
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-white">{totalCount}</div>
          <div className="text-xs text-white/40">Total</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-300">{presentCount}</div>
          <div className="text-xs text-white/40">Présents</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-300">{attendanceRate}%</div>
          <div className="text-xs text-white/40">Taux</div>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un étudiant..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 p-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400"
        />
      </div>

      {/* Sélection rapide */}
      {students.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={toggleSelectAll}
            className="flex-1 py-2 text-sm bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors"
          >
            {selectAll ? '❌ Désélectionner tout' : '✅ Sélectionner tout'}
          </button>
        </div>
      )}

      {/* Liste des étudiants */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">Aucun étudiant sans téléphone</div>
        ) : (
          filteredStudents.map(student => (
            <div
              key={student.id}
              onClick={() => toggleStudent(student.id)}
              className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors ${
                student.status === 'present'
                  ? 'bg-green-500/20 border border-green-500/30'
                  : 'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08]'
              }`}
            >
              <div>
                <p className="text-white text-sm font-medium">{student.full_name}</p>
                <p className="text-white/40 text-xs">{student.branch} - Niveau {student.level}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${student.status === 'present' ? 'text-green-300' : 'text-white/30'}`}>
                  {student.status === 'present' ? '✓ Présent' : '○ Absent'}
                </span>
                <div className={`w-5 h-5 rounded-full border-2 ${
                  student.status === 'present'
                    ? 'bg-green-400 border-green-400'
                    : 'border-white/30'
                }`} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bouton enregistrer */}
      {students.length > 0 && (
        <button
          onClick={saveAttendances}
          disabled={saving}
          className="w-full py-3 bg-white text-[#1a3a8f] rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les présences'}
        </button>
      )}
    </div>
  )
}
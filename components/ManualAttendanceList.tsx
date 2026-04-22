'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface Student {
  id: string
  name: string
  phone: string | null
  hasPhone: boolean
  status: string
  method: string | null
}

interface ManualAttendanceListProps {
  sessionId: string
  students: Student[]
  onSave: () => void
}

export const ManualAttendanceList = ({ sessionId, students, onSave }: ManualAttendanceListProps) => {
  const [localStudents, setLocalStudents] = useState<Student[]>(students)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalStudents(students)
  }, [students])

  const togglePresence = (studentId: string) => {
    setLocalStudents(prev => prev.map(s =>
      s.id === studentId
        ? { ...s, status: s.status === 'present' ? 'absent' : 'present' }
        : s
    ))
  }

  const saveAttendances = async () => {
    setSaving(true)
    try {
      const attendances = localStudents.map(s => ({
        studentId: s.id,
        status: s.status
      }))

      const res = await fetch('/api/service/attendance/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ sessionId, attendances })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Présences enregistrées')
        onSave()
      } else {
        toast.error(data.error || 'Erreur')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const presentCount = localStudents.filter(s => s.status === 'present').length
  const totalCount = localStudents.length
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

  // Séparer les étudiants avec et sans téléphone
  const withPhone = localStudents.filter(s => s.hasPhone)
  const withoutPhone = localStudents.filter(s => !s.hasPhone)

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold">{totalCount}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{presentCount}</div>
          <div className="text-xs text-gray-500">Présents</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{attendanceRate}%</div>
          <div className="text-xs text-gray-500">Taux</div>
        </div>
      </div>

      {/* Liste des étudiants avec téléphone (déjà marqués par code) */}
      {withPhone.length > 0 && (
        <div>
          <h3 className="font-medium mb-2 text-green-700">📱 Avec téléphone (validés par code)</h3>
          <div className="space-y-2">
            {withPhone.map(student => (
              <div key={student.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="font-medium">{student.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600">
                    {student.status === 'present' ? '✓ Présent' : '✗ Absent'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {student.method === 'code' ? 'par code' : 'manuel'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste des étudiants sans téléphone (pointage manuel) */}
      {withoutPhone.length > 0 && (
        <div>
          <h3 className="font-medium mb-2 text-orange-700">📝 Sans téléphone (pointage manuel)</h3>
          <div className="space-y-2">
            {withoutPhone.map(student => (
              <div
                key={student.id}
                onClick={() => togglePresence(student.id)}
                className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors ${
                  student.status === 'present'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="font-medium">{student.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{student.phone || 'Pas de téléphone'}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={student.status === 'present'}
                      onChange={() => togglePresence(student.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5"
                    />
                    <span className={`text-sm ${student.status === 'present' ? 'text-green-600' : 'text-gray-400'}`}>
                      {student.status === 'present' ? 'Présent' : 'Absent'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={saveAttendances} disabled={saving}>
          {saving ? 'Enregistrement...' : 'Enregistrer les présences'}
        </Button>
      </div>
    </div>
  )
}
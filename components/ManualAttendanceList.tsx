'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => { setLocalStudents(students) }, [students])

  const togglePresence = (studentId: string) => {
    setLocalStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, status: s.status === 'present' ? 'absent' : 'present' } : s
    ))
  }

  const saveAttendances = async () => {
    setSaving(true)
    try {
      const attendances = localStudents.map(s => ({ studentId: s.id, status: s.status }))
      const res = await fetch('/api/service/attendance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ sessionId, attendances })
      })
      const data = await res.json()
      if (res.ok) { toast.success('Présences enregistrées'); onSave() }
      else toast.error(data.error || 'Erreur')
    } catch (error) { toast.error('Erreur lors de l\'enregistrement') }
    finally { setSaving(false) }
  }

  const presentCount = localStudents.filter(s => s.status === 'present').length
  const totalCount = localStudents.length
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0

  const withPhone = localStudents.filter(s => s.hasPhone)
  const withoutPhone = localStudents.filter(s => !s.hasPhone)

  return (
    <div className="space-y-6 text-white">
      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: totalCount, label: 'Total', bg: 'bg-white/[0.04]' },
          { value: presentCount, label: 'Présents', bg: 'bg-green-500/10', color: 'text-green-300' },
          { value: `${attendanceRate}%`, label: 'Taux', bg: 'bg-blue-500/10', color: 'text-blue-300' }
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} backdrop-blur-2xl border border-white/[0.08] rounded-xl p-3 text-center`}>
            <div className={`text-xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</div>
            <div className="text-xs text-white/40">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Avec téléphone */}
      {withPhone.length > 0 && (
        <div>
          <h3 className="text-sm text-green-300/80 mb-2">📱 Avec téléphone (validés par code)</h3>
          <div className="space-y-2">
            {withPhone.map(student => (
              <div key={student.id} className="flex justify-between items-center p-3 bg-green-500/[0.04] border border-green-500/10 rounded-lg">
                <span className="text-white/80 text-sm">{student.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${student.status === 'present' ? 'text-green-300' : 'text-red-300'}`}>
                    {student.status === 'present' ? '✓ Présent' : '✗ Absent'}
                  </span>
                  <span className="text-xs text-white/30">{student.method === 'code' ? 'par code' : 'manuel'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sans téléphone */}
      {withoutPhone.length > 0 && (
        <div>
          <h3 className="text-sm text-amber-300/80 mb-2">📝 Sans téléphone (pointage manuel)</h3>
          <div className="space-y-2">
            {withoutPhone.map(student => (
              <div key={student.id} onClick={() => togglePresence(student.id)}
                className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors ${
                  student.status === 'present'
                    ? 'bg-green-500/[0.06] border border-green-500/15'
                    : 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06]'
                }`}>
                <span className="text-white/80 text-sm">{student.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-white/40 text-xs">{student.phone || 'Pas de téléphone'}</span>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={student.status === 'present'}
                      onChange={() => togglePresence(student.id)} onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-white/30 bg-white/10 accent-indigo-400" />
                    <span className={`text-xs ${student.status === 'present' ? 'text-green-300' : 'text-white/30'}`}>
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
        <button onClick={saveAttendances} disabled={saving}
          className="px-6 py-2 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50" style={{ fontFamily: "'Crimson Text', serif" }}>
          {saving ? 'Enregistrement...' : 'Enregistrer les présences'}
        </button>
      </div>
    </div>
  )
}
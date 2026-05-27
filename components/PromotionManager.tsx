// components/PromotionManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserGroupIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface Student {
  id: string
  full_name: string
  level: number
  branch: string
  service_id: string
  service_name?: string
}

export const PromotionManager = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState(false)
  const [services, setServices] = useState<any[]>([])
  const [branches, setBranches] = useState<string[]>([])
  
  // Filtres
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedService, setSelectedService] = useState<string>('all')
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [targetLevel, setTargetLevel] = useState<number>(2)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchStudents()
    fetchServices()
    fetchBranches()
  }, [selectedLevel, selectedService, selectedBranch])

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('id, name')
    if (data) setServices(data)
  }

  const fetchBranches = async () => {
    const { data } = await supabase.from('students').select('branch').is('deleted_at', null)
    if (data) {
      const unique = [...new Set(data.map(s => s.branch))].sort()
      setBranches(unique)
    }
  }

  const fetchStudents = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('students')
        .select('*, services(name)')
        .is('deleted_at', null)
        .order('full_name')

      if (selectedLevel !== 'all') {
        query = query.eq('level', parseInt(selectedLevel))
      }
      if (selectedService !== 'all') {
        query = query.eq('service_id', selectedService)
      }
      if (selectedBranch !== 'all') {
        query = query.eq('branch', selectedBranch)
      }

      const { data } = await query
      if (data) {
        const studentsWithService = data.map(s => ({
          ...s,
          service_name: (s.services as any)?.name
        }))
        setStudents(studentsWithService)
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur chargement étudiants')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)))
    }
  }

  const toggleSelectStudent = (id: string) => {
    const newSet = new Set(selectedStudents)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedStudents(newSet)
  }

  const promoteSelected = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Sélectionnez au moins un étudiant')
      return
    }

    const confirm = window.confirm(
      `⚠️ Êtes-vous sûr de vouloir promouvoir ${selectedStudents.size} étudiant(s) au Niveau ${targetLevel} ?\n\nCette action est irréversible.`
    )
    if (!confirm) return

    setPromoting(true)
    try {
      const res = await fetch('/api/students/bulk-promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          targetLevel,
          reason: `Promotion en masse via l'interface d'administration`
        })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        setSelectedStudents(new Set())
        fetchStudents()
      } else {
        toast.error(data.error || 'Erreur lors de la promotion')
      }
    } catch (error) {
      toast.error('Erreur réseau')
    } finally {
      setPromoting(false)
    }
  }

  const promoteIndividual = async (studentId: string, currentLevel: number) => {
    const newLevel = currentLevel + 1
    if (newLevel > 3) {
      toast.error('L\'étudiant est déjà au niveau maximum')
      return
    }

    const confirm = window.confirm(`Promouvoir ${students.find(s => s.id === studentId)?.full_name} au Niveau ${newLevel} ?`)
    if (!confirm) return

    try {
      const res = await fetch(`/api/students/${studentId}/level`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ level: newLevel })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        fetchStudents()
      } else {
        toast.error(data.error || 'Erreur')
      }
    } catch (error) {
      toast.error('Erreur réseau')
    }
  }

  const selectClass = "w-full p-2 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"

  if (loading) {
    return <div className="text-center py-8 text-white/60">Chargement...</div>
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            🎓 Gestion des promotions
          </h2>
          <p className="text-white/50 text-xs mt-1">Changez le niveau des étudiants</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm">
            {showFilters ? 'Masquer filtres' : 'Filtres'}
          </Button>
          <Button onClick={fetchStudents} variant="outline" size="sm">
            <ArrowPathIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Niveau actuel</label>
              <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className={selectClass}>
                <option value="all">Tous</option>
                <option value="1">Niveau 1</option>
                <option value="2">Niveau 2</option>
                <option value="3">Niveau 3</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Service</label>
              <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} className={selectClass}>
                <option value="all">Tous</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Branche</label>
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className={selectClass}>
                <option value="all">Toutes</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Promouvoir vers</label>
              <select value={targetLevel} onChange={(e) => setTargetLevel(parseInt(e.target.value))} className={selectClass}>
                <option value="2">Niveau 2</option>
                <option value="3">Niveau 3</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Barre d'action */}
      {selectedStudents.size > 0 && (
        <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-xl p-4 flex justify-between items-center">
          <div>
            <span className="text-white font-medium">{selectedStudents.size} étudiant(s) sélectionné(s)</span>
            <p className="text-white/50 text-xs">Niveau cible: {targetLevel}</p>
          </div>
          <Button onClick={promoteSelected} disabled={promoting} className="bg-indigo-600 hover:bg-indigo-700">
            {promoting ? 'Promotion...' : `Promouvoir au Niveau ${targetLevel}`}
          </Button>
        </div>
      )}

      {/* Liste des étudiants */}
      <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/[0.04]">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectedStudents.size === students.length && students.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-white/30 bg-white/10"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Nom</th>
                <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Service</th>
                <th className="px-4 py-3 text-left text-xs text-white/40 uppercase">Branche</th>
                <th className="px-4 py-3 text-center text-xs text-white/40 uppercase">Niveau actuel</th>
                <th className="px-4 py-3 text-center text-xs text-white/40 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-white/[0.04]">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.id)}
                      onChange={() => toggleSelectStudent(student.id)}
                      className="w-4 h-4 rounded border-white/30 bg-white/10"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-white/80">{student.full_name}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{student.service_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{student.branch}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300">
                      Niveau {student.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {student.level < 3 && (
                      <button
                        onClick={() => promoteIndividual(student.id, student.level)}
                        className="text-green-400 hover:text-green-300 text-sm"
                      >
                        ↑ Niveau {student.level + 1}
                      </button>
                    )}
                    {student.level === 3 && (
                      <span className="text-white/30 text-xs">Niveau max</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {students.length === 0 && (
        <div className="text-center py-8 text-white/40 text-sm">
          Aucun étudiant trouvé
        </div>
      )}
    </div>
  )
}
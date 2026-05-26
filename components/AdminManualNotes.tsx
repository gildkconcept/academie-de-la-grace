// components/AdminManualNotes.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { PhoneXMarkIcon, PencilIcon, TrashIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Student {
  id: string
  full_name: string
  username: string
  level: number
  service_id: string
  phone: string
  has_phone: boolean
  maison_grace: string
  branch?: string
}

interface Quiz {
  id: string
  title: string
  level: number
  start_date: string
  end_date: string
}

interface ManualNote {
  id: string
  student_id: string
  quiz_id: string
  score: number
  total_questions: number
  percentage: number
  quiz: Quiz
  admin: { name: string }
}

export const AdminManualNotes = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [manualNotes, setManualNotes] = useState<ManualNote[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingNote, setEditingNote] = useState<ManualNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    quizId: '',
    score: '',
    totalQuestions: '',
    percentage: ''
  })

  useEffect(() => {
    fetchData()
  }, [selectedStudent])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/quiz-manual?${selectedStudent ? `studentId=${selectedStudent}` : ''}`, {
        credentials: 'include'
      })
      const data = await res.json()
      if (res.ok) {
        setStudents(data.students || [])
        setQuizzes(data.quizzes || [])
        setManualNotes(data.manualNotes || [])
      }
    } catch (error) {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedStudent || !formData.quizId) {
      toast.error('Veuillez sélectionner un étudiant et un quiz')
      return
    }

    const score = parseInt(formData.score)
    const totalQuestions = parseInt(formData.totalQuestions)
    
    if (isNaN(score) || isNaN(totalQuestions) || score < 0 || score > totalQuestions) {
      toast.error('Score invalide')
      return
    }

    const percentage = (score / totalQuestions) * 100

    try {
      const res = await fetch('/api/admin/quiz-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          studentId: selectedStudent,
          quizId: formData.quizId,
          score,
          totalQuestions,
          percentage,
          action: editingNote ? 'update' : 'create'
        })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(editingNote ? 'Note modifiée' : 'Note ajoutée')
        setShowModal(false)
        setEditingNote(null)
        setFormData({ quizId: '', score: '', totalQuestions: '', percentage: '' })
        fetchData()
      } else {
        toast.error(data.error || 'Erreur')
      }
    } catch (error) {
      toast.error('Erreur réseau')
    }
  }

  const handleDelete = async (note: ManualNote) => {
    if (!confirm(`Supprimer la note pour ${note.quiz?.title} ?`)) return

    try {
      const res = await fetch('/api/admin/quiz-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          studentId: note.student_id,
          quizId: note.quiz_id,
          action: 'delete'
        })
      })

      if (res.ok) {
        toast.success('Note supprimée')
        fetchData()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      toast.error('Erreur réseau')
    }
  }

  const openEditModal = (note: ManualNote) => {
    setEditingNote(note)
    setFormData({
      quizId: note.quiz_id,
      score: note.score.toString(),
      totalQuestions: note.total_questions.toString(),
      percentage: note.percentage.toString()
    })
    setShowModal(true)
  }

  const selectClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400"
  const inputClass = "w-full px-4 py-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"

  if (loading && students.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  const noPhoneStudents = students.filter(s => !s.has_phone)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PhoneXMarkIcon className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Gestion des notes - Étudiants sans téléphone
          </h2>
        </div>
        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
          {noPhoneStudents.length} étudiant(s)
        </span>
      </div>

      {/* Sélection de l'étudiant */}
      <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4">
        <label className="block text-sm text-white/70 mb-2">Étudiant sans téléphone</label>
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className={selectClass}
        >
          <option value="">Sélectionner un étudiant</option>
          {noPhoneStudents.map(student => (
            <option key={student.id} value={student.id}>
              {student.full_name} - Niveau {student.level} - {student.branch || 'Branche inconnue'}
            </option>
          ))}
        </select>
      </div>

      {selectedStudent && (
        <>
          {/* Formulaire d'ajout de note */}
          <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-medium">Ajouter une note</h3>
              <button
                onClick={() => { setShowModal(true); setEditingNote(null); setFormData({ quizId: '', score: '', totalQuestions: '', percentage: '' }) }}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-xs hover:bg-green-500/30 transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Nouvelle note
              </button>
            </div>
          </div>

          {/* Liste des notes manuelles */}
          {manualNotes.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-white/70 text-sm">Notes ajoutées manuellement</h3>
              {manualNotes.map(note => (
                <div key={note.id} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium">{note.quiz?.title || 'Quiz inconnu'}</p>
                      <p className="text-white/40 text-xs">Niveau {note.quiz?.level}</p>
                      <div className="mt-2">
                        <span className="text-green-300 font-bold text-lg">{note.score}</span>
                        <span className="text-white/40">/{note.total_questions}</span>
                        <span className="ml-2 text-white/60">({Math.round(note.percentage)}%)</span>
                      </div>
                      {note.admin && (
                        <p className="text-white/30 text-xs mt-1">Ajouté par {note.admin.name}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(note)}
                        className="p-2 text-blue-300 hover:text-blue-200 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(note)}
                        className="p-2 text-red-300 hover:text-red-200 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-8 text-center text-white/40 text-sm">
              Aucune note manuelle pour cet étudiant
            </div>
          )}
        </>
      )}

      {/* Modal d'ajout/modification */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[rgba(8,20,90,0.97)] backdrop-blur-2xl border border-white/[0.15] rounded-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {editingNote ? 'Modifier la note' : 'Ajouter une note'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-white/50 hover:text-white">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Quiz</label>
                  <select
                    value={formData.quizId}
                    onChange={(e) => setFormData({ ...formData, quizId: e.target.value })}
                    className={selectClass}
                    disabled={!!editingNote}
                  >
                    <option value="">Sélectionner un quiz</option>
                    {quizzes.map(quiz => (
                      <option key={quiz.id} value={quiz.id}>
                        {quiz.title} - Niveau {quiz.level}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Score</label>
                    <input
                      type="number"
                      value={formData.score}
                      onChange={(e) => {
                        setFormData({ ...formData, score: e.target.value })
                        const score = parseInt(e.target.value)
                        const total = parseInt(formData.totalQuestions)
                        if (!isNaN(score) && !isNaN(total) && total > 0) {
                          setFormData(prev => ({ ...prev, percentage: ((score / total) * 100).toFixed(1) }))
                        }
                      }}
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-1">Total questions</label>
                    <input
                      type="number"
                      value={formData.totalQuestions}
                      onChange={(e) => {
                        setFormData({ ...formData, totalQuestions: e.target.value })
                        const score = parseInt(formData.score)
                        const total = parseInt(e.target.value)
                        if (!isNaN(score) && !isNaN(total) && total > 0) {
                          setFormData(prev => ({ ...prev, percentage: ((score / total) * 100).toFixed(1) }))
                        }
                      }}
                      className={inputClass}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-1">Pourcentage</label>
                  <input
                    type="text"
                    value={formData.percentage}
                    readOnly
                    className={`${inputClass} bg-white/50 cursor-not-allowed`}
                    placeholder="0%"
                  />
                  <p className="text-xs text-white/40 mt-1">Calculé automatiquement</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSubmit}
                    className="flex-1 bg-white text-[#1a3a8f] py-2.5 rounded-lg text-sm font-bold hover:shadow-lg transition-all"
                  >
                    {editingNote ? 'Modifier' : 'Ajouter'}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-white/10 text-white/70 py-2.5 rounded-lg text-sm hover:bg-white/20 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
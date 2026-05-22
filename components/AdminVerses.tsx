'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { CalendarIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'

interface Verse {
  id: number
  verse: string
  reference: string
  displayed_date: string
  is_active: boolean
  created_at: string
}

export const AdminVerses = () => {
  const [verses, setVerses] = useState<Verse[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingVerse, setEditingVerse] = useState<Verse | null>(null)
  
  const [formData, setFormData] = useState({
    verse: '',
    reference: '',
    displayed_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchVerses()
  }, [])

  const fetchVerses = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/verses', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) setVerses(data)
    } catch (error) {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.verse || !formData.reference || !formData.displayed_date) {
      toast.error('Tous les champs sont requis')
      return
    }

    try {
      const method = editingVerse ? 'PUT' : 'POST'
      const body = editingVerse 
        ? { ...formData, id: editingVerse.id, is_active: true }
        : formData

      const res = await fetch('/api/admin/verses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      if (res.ok) {
        toast.success(editingVerse ? 'Verset modifié' : 'Verset ajouté')
        setShowForm(false)
        setEditingVerse(null)
        setFormData({ verse: '', reference: '', displayed_date: new Date().toISOString().split('T')[0] })
        fetchVerses()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Erreur')
      }
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce verset ?')) return
    
    try {
      const res = await fetch(`/api/admin/verses?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (res.ok) {
        toast.success('Verset supprimé')
        fetchVerses()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      toast.error('Erreur réseau')
    }
  }

  const handleEdit = (verse: Verse) => {
    setEditingVerse(verse)
    setFormData({
      verse: verse.verse,
      reference: verse.reference,
      displayed_date: verse.displayed_date
    })
    setShowForm(true)
  }

  const inputClass = "w-full p-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
  const textareaClass = "w-full p-2.5 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            📖 Gestion des versets du jour
          </h3>
          <p className="text-white/50 text-xs mt-1">Programmez les versets pour chaque jour</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingVerse(null); setFormData({ verse: '', reference: '', displayed_date: new Date().toISOString().split('T')[0] }) }}
          className="flex items-center gap-2 px-4 py-2 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all"
        >
          <PlusIcon className="w-4 h-4" /> Nouveau verset
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[rgba(8,20,90,0.97)] backdrop-blur-2xl border border-white/[0.15] rounded-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-normal text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                {editingVerse ? 'Modifier le verset' : 'Ajouter un verset'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.displayed_date}
                    onChange={(e) => setFormData({ ...formData, displayed_date: e.target.value })}
                    className={inputClass}
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-white/70 mb-1">Référence (ex: Jean 3:16)</label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="Jean 3:16"
                    className={inputClass}
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-white/70 mb-1">Texte du verset</label>
                  <textarea
                    rows={4}
                    value={formData.verse}
                    onChange={(e) => setFormData({ ...formData, verse: e.target.value })}
                    placeholder="Car Dieu a tant aimé le monde..."
                    className={textareaClass}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSubmit}
                    className="flex-1 bg-white text-[#1a3a8f] py-2.5 rounded-lg text-sm font-bold hover:shadow-lg transition-all"
                  >
                    {editingVerse ? 'Modifier' : 'Ajouter'}
                  </button>
                  <button
                    onClick={() => { setShowForm(false); setEditingVerse(null) }}
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

      {/* Liste des versets */}
      {loading ? (
        <div className="text-center py-8 text-white/50">Chargement...</div>
      ) : verses.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-8 text-center text-white/40 text-sm">
          Aucun verset programmé
        </div>
      ) : (
        <div className="space-y-3">
          {verses.map((verse) => (
            <div key={verse.id} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-white/40 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" />
                      {new Date(verse.displayed_date).toLocaleDateString('fr-FR')}
                    </span>
                    {verse.displayed_date === new Date().toISOString().split('T')[0] && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full">Aujourd'hui</span>
                    )}
                  </div>
                  <p className="text-white/90 text-sm italic mb-2">"{verse.verse}"</p>
                  <p className="text-blue-300/80 text-sm font-medium">— {verse.reference}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(verse)}
                    className="p-2 text-white/50 hover:text-blue-300 transition-colors"
                    title="Modifier"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(verse.id)}
                    className="p-2 text-white/50 hover:text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
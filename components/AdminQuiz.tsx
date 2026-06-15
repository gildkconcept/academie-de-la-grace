'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Quiz, QuizResult } from '@/types'
import { quizService } from '@/services/quizService'

export const AdminQuiz = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [results, setResults] = useState<QuizResult[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalSubmissions: 0, totalStudents: 0, averageScore: 0, perfectScores: 0 })

  const [newQuiz, setNewQuiz] = useState({
    title: '', description: '', level: '1',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    questions: [{ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' }]
  })

  useEffect(() => { fetchQuizzes(); fetchResults() }, [selectedQuiz, selectedLevel])

  const fetchQuizzes = async () => {
    try {
      const data = await quizService.getAll()
      setQuizzes(data)
    } catch (error) { 
      console.error('Erreur fetchQuizzes:', error) 
    }
  }

  const fetchResults = async () => {
    setLoading(true)
    try {
      const data = await quizService.getAllResults(selectedQuiz, selectedLevel)
      setResults(data.results || [])
      setStats(data.stats || { totalSubmissions: 0, totalStudents: 0, averageScore: 0, perfectScores: 0 })
    } catch (error) { 
      console.error('Erreur fetchResults:', error) 
    } finally { 
      setLoading(false) 
    }
  }

  const addQuestion = () => setNewQuiz(prev => ({ ...prev, questions: [...prev.questions, { question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' }] }))
  const removeQuestion = (index: number) => setNewQuiz(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) }))
  const updateQuestion = (index: number, field: string, value: string) => setNewQuiz(prev => ({ ...prev, questions: prev.questions.map((q, i) => i === index ? { ...q, [field]: value } : q) }))

  const createQuiz = async () => {
    if (!newQuiz.title || !newQuiz.start_date || !newQuiz.end_date) { toast.error('Champs obligatoires manquants'); return }
    const invalid = newQuiz.questions.some(q => !q.question || !q.option_a || !q.option_b || !q.option_c || !q.option_d)
    if (invalid) { toast.error('Remplissez toutes les questions'); return }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/quizzes', {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }, 
        credentials: 'include', 
        body: JSON.stringify(newQuiz)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Quiz créé !')
        setShowCreateForm(false)
        setNewQuiz({ title: '', description: '', level: '1', start_date: new Date().toISOString().split('T')[0], end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], questions: [{ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' }] })
        fetchQuizzes()
      } else toast.error(data.error || 'Erreur création')
    } catch (error) { toast.error('Erreur réseau') }
  }

  const inputClass = "w-full p-2 bg-white/90 border border-white/30 rounded-lg text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400"
  const selectClass = "w-full p-2 bg-white/90 border border-white/30 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-indigo-400 [&>option]:bg-white [&>option]:text-gray-900"
  const glassCard = "bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl"

  if (showCreateForm) {
    return (
      <div className={glassCard}>
        <div className="px-4 sm:px-6 py-4 border-b border-white/[0.08]">
          <h3 className="text-base sm:text-lg font-normal text-white/90" style={{ fontFamily: "'Playfair Display', serif" }}>📝 Créer un nouveau quiz</h3>
        </div>
        <div className="px-4 sm:px-6 pb-6 space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm text-white/70 mb-1">Titre *</label><input type="text" value={newQuiz.title} onChange={(e) => setNewQuiz(prev => ({ ...prev, title: e.target.value }))} className={inputClass} /></div>
            <div><label className="block text-sm text-white/70 mb-1">Niveau *</label><select value={newQuiz.level} onChange={(e) => setNewQuiz(prev => ({ ...prev, level: e.target.value }))} className={selectClass}><option value="1">Niveau 1</option><option value="2">Niveau 2</option><option value="3">Niveau 3</option></select></div>
            <div><label className="block text-sm text-white/70 mb-1">Date début *</label><input type="date" value={newQuiz.start_date} onChange={(e) => setNewQuiz(prev => ({ ...prev, start_date: e.target.value }))} className={inputClass} /></div>
            <div><label className="block text-sm text-white/70 mb-1">Date fin *</label><input type="date" value={newQuiz.end_date} onChange={(e) => setNewQuiz(prev => ({ ...prev, end_date: e.target.value }))} className={inputClass} /></div>
          </div>
          <div><label className="block text-sm text-white/70 mb-1">Description</label><textarea value={newQuiz.description} onChange={(e) => setNewQuiz(prev => ({ ...prev, description: e.target.value }))} className={inputClass} rows={2} /></div>
          
          <div className="border-t border-white/[0.08] pt-4">
            <h4 className="text-white font-medium mb-3">Questions</h4>
            {newQuiz.questions.map((q, idx) => (
              <div key={idx} className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-white/80 text-sm font-medium">Question {idx + 1}</span>
                  {newQuiz.questions.length > 1 && <button onClick={() => removeQuestion(idx)} className="text-red-400 text-xs hover:text-red-300">Supprimer</button>}
                </div>
                <input type="text" placeholder="Question" value={q.question} onChange={(e) => updateQuestion(idx, 'question', e.target.value)} className={`${inputClass} mb-2`} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {['a','b','c','d'].map(l => (
                    <input key={l} type="text" placeholder={`Option ${l.toUpperCase()}`} value={(q as any)[`option_${l}`]} onChange={(e) => updateQuestion(idx, `option_${l}`, e.target.value)} className={inputClass} />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-white/60">Bonne réponse :</span>
                  <select value={q.correct_answer} onChange={(e) => updateQuestion(idx, 'correct_answer', e.target.value)} className={`${selectClass} w-20`}>
                    {['A','B','C','D'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
            ))}
            <button onClick={addQuestion} className="w-full py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors">+ Ajouter une question</button>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors">Annuler</button>
            <button onClick={createQuiz} className="px-6 py-2 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all">Publier le quiz</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-normal text-white" style={{ fontFamily: "'Playfair Display', serif" }}>📊 Résultats des quiz</h2>
        <button onClick={() => setShowCreateForm(true)} className="px-4 py-2 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all">+ Nouveau quiz</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { value: stats.totalSubmissions, label: 'Participations', color: 'text-white' },
          { value: stats.totalStudents, label: 'Étudiants', color: 'text-green-300' },
          { value: `${stats.averageScore}%`, label: 'Moyenne', color: 'text-blue-300' },
          { value: stats.perfectScores, label: 'Scores parfaits', color: 'text-yellow-300' }
        ].map((s, i) => (
          <div key={i} className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-white/50 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <select value={selectedQuiz} onChange={(e) => setSelectedQuiz(e.target.value)} className={selectClass}>
          <option value="all">Tous les quiz</option>
          {quizzes.map(quiz => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
        </select>
        <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} className={selectClass}>
          <option value="all">Tous niveaux</option>
          <option value="1">Niveau 1</option><option value="2">Niveau 2</option><option value="3">Niveau 3</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-white/50">Chargement...</div>
      ) : results.length === 0 ? (
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-8 text-center text-white/40 text-sm">Aucun résultat pour le moment</div>
      ) : (
        <div className="space-y-3">
          {results.map(result => (
            <div key={result.id} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 flex justify-between items-center flex-wrap gap-3">
              <div>
                <p className="text-white font-medium text-sm">{result.student?.full_name}</p>
                <p className="text-white/40 text-xs">{result.quiz?.title} - Niveau {result.quiz?.level}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white">{result.score}/{result.total_questions}</p>
                <p className="text-white/40 text-xs">{result.percentage}% - {new Date(result.submitted_at).toLocaleDateString('fr-FR')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
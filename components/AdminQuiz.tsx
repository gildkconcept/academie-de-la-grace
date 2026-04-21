'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Quiz, QuizResult } from '@/types'

export const AdminQuiz = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [results, setResults] = useState<QuizResult[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalSubmissions: 0, totalStudents: 0, averageScore: 0, perfectScores: 0 })

  // Formulaire création quiz
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    level: '1',
    start_date: '',
    end_date: '',
    questions: [{ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' }]
  })

  useEffect(() => {
    fetchQuizzes()
    fetchResults()
  }, [selectedQuiz, selectedLevel])

  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (res.ok) setQuizzes(data)
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const fetchResults = async () => {
    setLoading(true)
    try {
      let url = '/api/quiz-results?'
      if (selectedQuiz !== 'all') url += `quizId=${selectedQuiz}&`
      if (selectedLevel !== 'all') url += `level=${selectedLevel}&`
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (res.ok) {
        setResults(data.results || [])
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const addQuestion = () => {
    setNewQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, { question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' }]
    }))
  }

  const removeQuestion = (index: number) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }))
  }

  const updateQuestion = (index: number, field: string, value: string) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === index ? { ...q, [field]: value } : q)
    }))
  }

  const createQuiz = async () => {
    if (!newQuiz.title || !newQuiz.start_date || !newQuiz.end_date) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    const invalidQuestions = newQuiz.questions.some(q => !q.question || !q.option_a || !q.option_b || !q.option_c || !q.option_d)
    if (invalidQuestions) {
      toast.error('Veuillez remplir toutes les questions et options')
      return
    }

    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newQuiz)
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Quiz créé avec succès')
        setShowCreateForm(false)
        setNewQuiz({
          title: '',
          description: '',
          level: '1',
          start_date: '',
          end_date: '',
          questions: [{ question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' }]
        })
        fetchQuizzes()
      } else {
        toast.error(data.error || 'Erreur création')
      }
    } catch (error) {
      toast.error('Erreur réseau')
    }
  }

  if (showCreateForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📝 Créer un nouveau quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Titre du quiz *</label>
              <input
                type="text"
                value={newQuiz.title}
                onChange={(e) => setNewQuiz(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Niveau *</label>
              <select
                value={newQuiz.level}
                onChange={(e) => setNewQuiz(prev => ({ ...prev, level: e.target.value }))}
                className="w-full p-2 border rounded-lg"
              >
                <option value="1">Niveau 1</option>
                <option value="2">Niveau 2</option>
                <option value="3">Niveau 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date de début *</label>
              <input
                type="date"
                value={newQuiz.start_date}
                onChange={(e) => setNewQuiz(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date de fin *</label>
              <input
                type="date"
                value={newQuiz.end_date}
                onChange={(e) => setNewQuiz(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description (optionnel)</label>
            <textarea
              value={newQuiz.description}
              onChange={(e) => setNewQuiz(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2 border rounded-lg"
              rows={2}
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-medium mb-3">Questions</h3>
            {newQuiz.questions.map((q, idx) => (
              <div key={idx} className="border p-4 rounded-lg mb-4">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Question {idx + 1}</span>
                  {newQuiz.questions.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeQuestion(idx)} className="text-red-500">
                      Supprimer
                    </Button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Question"
                  value={q.question}
                  onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                  className="w-full p-2 border rounded-lg mb-2"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Option A"
                    value={q.option_a}
                    onChange={(e) => updateQuestion(idx, 'option_a', e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Option B"
                    value={q.option_b}
                    onChange={(e) => updateQuestion(idx, 'option_b', e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Option C"
                    value={q.option_c}
                    onChange={(e) => updateQuestion(idx, 'option_c', e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Option D"
                    value={q.option_d}
                    onChange={(e) => updateQuestion(idx, 'option_d', e.target.value)}
                    className="p-2 border rounded-lg"
                  />
                </div>
                <div className="mt-2">
                  <label className="text-sm mr-2">Bonne réponse :</label>
                  <select
                    value={q.correct_answer}
                    onChange={(e) => updateQuestion(idx, 'correct_answer', e.target.value)}
                    className="p-1 border rounded"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addQuestion} className="w-full">
              + Ajouter une question
            </Button>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>Annuler</Button>
            <Button onClick={createQuiz}>Publier le quiz</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">📊 Résultats des quiz</h2>
        <Button onClick={() => setShowCreateForm(true)}>+ Nouveau quiz</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.totalSubmissions}</div>
            <div className="text-sm text-gray-500">Participations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalStudents}</div>
            <div className="text-sm text-gray-500">Étudiants</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.averageScore}%</div>
            <div className="text-sm text-gray-500">Moyenne générale</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.perfectScores}</div>
            <div className="text-sm text-gray-500">Scores parfaits</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <select
          value={selectedQuiz}
          onChange={(e) => setSelectedQuiz(e.target.value)}
          className="p-2 border rounded-lg"
        >
          <option value="all">Tous les quiz</option>
          {quizzes.map(quiz => (
            <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
          ))}
        </select>
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="p-2 border rounded-lg"
        >
          <option value="all">Tous niveaux</option>
          <option value="1">Niveau 1</option>
          <option value="2">Niveau 2</option>
          <option value="3">Niveau 3</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Chargement...</div>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">Aucun résultat pour le moment</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {results.map(result => (
            <Card key={result.id}>
              <CardContent className="p-4 flex justify-between items-center flex-wrap gap-3">
                <div>
                  <p className="font-semibold">{result.student?.full_name}</p>
                  <p className="text-sm text-gray-500">{result.quiz?.title} - Niveau {result.quiz?.level}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-indigo-600">{result.score}/{result.total_questions}</p>
                  <p className="text-sm text-gray-500">{result.percentage}% - {new Date(result.submitted_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
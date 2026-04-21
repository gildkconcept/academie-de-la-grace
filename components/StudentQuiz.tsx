'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Quiz, QuizResult } from '@/types'

export const StudentQuiz = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; total: number; percentage: number } | null>(null)
  const [myResults, setMyResults] = useState<QuizResult[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchQuizzes()
    fetchMyResults()
  }, [])

  const fetchQuizzes = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/quizzes', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (res.ok) {
        console.log('📚 Quiz reçus:', data)
        setQuizzes(Array.isArray(data) ? data : [])
      } else {
        console.error('Erreur API:', data)
        setError(data.error || 'Erreur chargement quiz')
      }
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const fetchMyResults = async () => {
    try {
      const res = await fetch('/api/my-results', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (res.ok) {
        setMyResults(data.results || [])
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const startQuiz = async (quizId: string) => {
    try {
      const res = await fetch(`/api/quizzes?id=${quizId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (res.ok) {
        setSelectedQuiz(data)
        setCurrentQuestionIndex(0)
        setAnswers({})
        setResult(null)
      } else {
        toast.error(data.error || 'Erreur chargement quiz')
      }
    } catch (error) {
      toast.error('Erreur réseau')
    }
  }

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = async () => {
    if (!selectedQuiz?.questions) return

    const allAnswered = selectedQuiz.questions.every(q => answers[q.id])
    if (!allAnswered) {
      toast.error('Veuillez répondre à toutes les questions')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/quizzes/${selectedQuiz.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ answers })
      })

      const data = await res.json()
      if (res.ok) {
        setResult({
          score: data.score,
          total: data.totalQuestions,
          percentage: data.percentage
        })
        toast.success(`Score: ${data.score}/${data.totalQuestions}`)
        fetchQuizzes()
        fetchMyResults()
      } else {
        toast.error(data.error || 'Erreur soumission')
      }
    } catch (error) {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  const closeQuiz = () => {
    setSelectedQuiz(null)
    setResult(null)
  }

  if (loading) {
    return <div className="text-center py-8">Chargement des quiz...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Erreur: {error}</div>
  }

  // Affichage du quiz en cours
  if (selectedQuiz && !result) {
    const currentQuestion = selectedQuiz.questions?.[currentQuestionIndex]
    const isLastQuestion = currentQuestionIndex === (selectedQuiz.questions?.length || 0) - 1

    if (!currentQuestion) {
      return <div className="text-center py-8">Question non trouvée</div>
    }

    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{selectedQuiz.title}</CardTitle>
          <div className="text-sm text-gray-500">
            Question {currentQuestionIndex + 1} / {selectedQuiz.questions?.length}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-lg font-medium">{currentQuestion.question}</div>
          <div className="space-y-3">
            {['A', 'B', 'C', 'D'].map(letter => {
              const optionKey = `option_${letter.toLowerCase()}` as keyof typeof currentQuestion
              const optionText = currentQuestion[optionKey] as string
              return (
                <label
                  key={letter}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === letter
                      ? 'bg-indigo-50 border-indigo-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={letter}
                    checked={answers[currentQuestion.id] === letter}
                    onChange={() => handleAnswer(currentQuestion.id, letter)}
                    className="w-4 h-4 text-indigo-600 mr-3"
                  />
                  <span className="font-medium mr-2">{letter}.</span>
                  <span>{optionText}</span>
                </label>
              )
            })}
          </div>
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
              disabled={currentQuestionIndex === 0}
            >
              ← Précédent
            </Button>
            {isLastQuestion ? (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Soumission...' : 'Terminer'}
              </Button>
            ) : (
              <Button onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>
                Suivant →
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Affichage du résultat
  if (result) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">📊 Résultat du quiz</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-5xl font-bold text-indigo-600">{result.score}/{result.total}</div>
          <div className="text-lg">Soit {result.percentage.toFixed(0)}%</div>
          {result.percentage === 100 && (
            <div className="bg-yellow-100 text-yellow-800 p-3 rounded-lg">
              🏆 Parfait ! Badge "Expert biblique" débloqué !
            </div>
          )}
          <div className="flex justify-center gap-3">
            <Button onClick={closeQuiz}>Fermer</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Voir les quiz disponibles
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Affichage de la liste des quiz
  const availableQuizzes = quizzes.filter(q => !q.completed)

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-2 px-4 ${activeTab === 'available' ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 'text-gray-500'}`}
        >
          Quiz disponibles ({availableQuizzes.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2 px-4 ${activeTab === 'history' ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 'text-gray-500'}`}
        >
          Mon historique ({myResults.length})
        </button>
      </div>

      {activeTab === 'available' && (
        <>
          {availableQuizzes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                Aucun quiz disponible pour le moment.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableQuizzes.map(quiz => (
                <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    {quiz.description && <p className="text-sm text-gray-500">{quiz.description}</p>}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Niveau</span>
                        <span className="font-medium">Niveau {quiz.level}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Date limite</span>
                        <span className="font-medium">{new Date(quiz.end_date).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <Button onClick={() => startQuiz(quiz.id)} className="w-full mt-4">
                        Commencer le quiz
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <>
          {myResults.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-gray-500">
                Vous n'avez pas encore participé à des quiz.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {myResults.map(result => (
                <Card key={result.id}>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{result.quiz?.title}</h3>
                      <p className="text-sm text-gray-500">
                        Niveau {result.quiz?.level} - {new Date(result.submitted_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-indigo-600">{result.score}/{result.total_questions}</div>
                      <div className="text-sm text-gray-500">{result.percentage}%</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
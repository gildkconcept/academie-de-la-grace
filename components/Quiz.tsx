'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Quiz, Question } from '@/types'

interface QuizComponentProps {
  quizId: string
  onComplete?: () => void
}

export const QuizComponent = ({ quizId, onComplete }: QuizComponentProps) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; total: number; percentage: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuiz()
  }, [quizId])

  const fetchQuiz = async () => {
    try {
      const res = await fetch(`/api/quizzes?id=${quizId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await res.json()
      if (res.ok) {
        setQuiz(data)
      } else {
        toast.error(data.error || 'Erreur chargement quiz')
      }
    } catch (error) {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = async () => {
    if (!quiz?.questions) return

    const allAnswered = quiz.questions.every(q => answers[q.id])
    if (!allAnswered) {
      toast.error('Veuillez répondre à toutes les questions')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
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
        if (onComplete) onComplete()
      } else {
        toast.error(data.error || 'Erreur soumission')
      }
    } catch (error) {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-center py-8">Chargement du quiz...</div>
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
          <Button onClick={() => window.location.reload()}>Fermer</Button>
        </CardContent>
      </Card>
    )
  }

  if (!quiz || !quiz.questions) return <div className="text-center py-8">Quiz non trouvé</div>

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{quiz.title}</CardTitle>
        <div className="text-sm text-gray-500">
          Question {currentQuestionIndex + 1} / {quiz.questions.length}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-lg font-medium">{currentQuestion.question}</div>
        <div className="space-y-3">
          {['A', 'B', 'C', 'D'].map(letter => {
            const optionKey = `option_${letter.toLowerCase()}` as keyof typeof currentQuestion
            const optionText = currentQuestion[optionKey]
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
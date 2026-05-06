'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
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

  useEffect(() => { fetchQuiz() }, [quizId])

  const fetchQuiz = async () => {
    try {
      const res = await fetch(`/api/quizzes?id=${quizId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      const data = await res.json()
      if (res.ok) setQuiz(data)
      else toast.error(data.error || 'Erreur chargement quiz')
    } catch (error) { toast.error('Erreur réseau') }
    finally { setLoading(false) }
  }

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = async () => {
    if (!quiz?.questions) return
    const allAnswered = quiz.questions.every(q => answers[q.id])
    if (!allAnswered) { toast.error('Veuillez répondre à toutes les questions'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/quizzes/${quizId}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ answers })
      })
      const data = await res.json()
      if (res.ok) { setResult({ score: data.score, total: data.totalQuestions, percentage: data.percentage }); toast.success(`Score: ${data.score}/${data.totalQuestions}`); if (onComplete) onComplete() }
      else toast.error(data.error || 'Erreur soumission')
    } catch (error) { toast.error('Erreur réseau') }
    finally { setSubmitting(false) }
  }

  if (loading) return <div className="text-center py-8 text-white/60">Chargement du quiz...</div>
  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-6 text-center">
          <h3 className="text-lg font-normal text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>📊 Résultat du quiz</h3>
          <div className="text-5xl font-bold text-white mb-2">{result.score}/{result.total}</div>
          <div className="text-white/60 mb-4">Soit {result.percentage.toFixed(0)}%</div>
          {result.percentage === 100 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 p-3 rounded-lg text-sm mb-4">🏆 Parfait ! Badge &quot;Expert biblique&quot; débloqué !</div>
          )}
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all">Fermer</button>
        </div>
      </div>
    )
  }

  if (!quiz || !quiz.questions) return <div className="text-center py-8 text-white/60">Quiz non trouvé</div>

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-6">
        <h3 className="text-lg font-normal text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>{quiz.title}</h3>
        <div className="text-sm text-white/50 mb-6">Question {currentQuestionIndex + 1} / {quiz.questions.length}</div>
        <div className="text-base text-white/90 mb-6">{currentQuestion.question}</div>
        <div className="space-y-3 mb-6">
          {['A', 'B', 'C', 'D'].map(letter => {
            const optionKey = `option_${letter.toLowerCase()}` as keyof typeof currentQuestion
            const optionText = currentQuestion[optionKey]
            return (
              <label key={letter}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  answers[currentQuestion.id] === letter ? 'bg-indigo-500/20 border-indigo-400/50 text-white' : 'bg-white/[0.04] border-white/[0.1] text-white/70 hover:bg-white/[0.08]'
                }`}>
                <input type="radio" name={`q-${currentQuestion.id}`} value={letter}
                  checked={answers[currentQuestion.id] === letter} onChange={() => handleAnswer(currentQuestion.id, letter)}
                  className="w-4 h-4 text-indigo-400 mr-3" />
                <span className="font-medium mr-2 text-white/60">{letter}.</span>
                <span>{optionText}</span>
              </label>
            )
          })}
        </div>
        <div className="flex justify-between">
          <button onClick={() => setCurrentQuestionIndex(prev => prev - 1)} disabled={currentQuestionIndex === 0}
            className="px-4 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors disabled:opacity-30">← Précédent</button>
          {isLastQuestion ? (
            <button onClick={handleSubmit} disabled={submitting}
              className="px-6 py-2 bg-white text-[#1a3a8f] rounded-lg text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50">{submitting ? 'Soumission...' : 'Terminer'}</button>
          ) : (
            <button onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              className="px-4 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors">Suivant →</button>
          )}
        </div>
      </div>
    </div>
  )
}
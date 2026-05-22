'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
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

  // 🕐 États du minuteur
  const [timeLeft, setTimeLeft] = useState<number>(600) // 10 minutes en secondes
  const [timerActive, setTimerActive] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { fetchQuizzes(); fetchMyResults() }, [])

  // 🕐 Gestion du minuteur
  useEffect(() => {
    if (selectedQuiz && !result && timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            // Temps écoulé → soumettre automatiquement
            toast.warning('⏰ Temps écoulé ! Soumission automatique...')
            handleSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [selectedQuiz, timerActive, result, timeLeft])

  // Nettoyer le minuteur à la fermeture
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const fetchQuizzes = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/quizzes', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) setQuizzes(Array.isArray(data) ? data : [])
      else setError(data.error || 'Erreur chargement quiz')
    } catch (error) { setError('Erreur de connexion') }
    finally { setLoading(false) }
  }

  const fetchMyResults = async () => {
    try {
      const res = await fetch('/api/my-results', { credentials: 'include' })
      const data = await res.json()
      if (res.ok) setMyResults(data.results || [])
    } catch (error) { console.error('Erreur:', error) }
  }

  // 🕐 Démarrer le quiz avec le minuteur
  const startQuiz = async (quizId: string) => {
    try {
      const res = await fetch(`/api/quizzes?id=${quizId}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setSelectedQuiz(data)
        setCurrentQuestionIndex(0)
        setAnswers({})
        setResult(null)
        setTimeLeft(600) // Réinitialiser à 10 minutes
        setTimerActive(true) // Démarrer le minuteur
      }
      else toast.error(data.error || 'Erreur chargement quiz')
    } catch (error) { toast.error('Erreur réseau') }
  }

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = async () => {
    if (!selectedQuiz?.questions) return
    setSubmitting(true)
    setTimerActive(false) // Arrêter le minuteur
    if (timerRef.current) clearInterval(timerRef.current)
    
    try {
      const res = await fetch(`/api/quizzes/${selectedQuiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers })
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ score: data.score, total: data.totalQuestions, percentage: data.percentage })
        toast.success(`Score: ${data.score}/${data.totalQuestions}`)
        fetchQuizzes(); fetchMyResults()
      } else toast.error(data.error || 'Erreur soumission')
    } catch (error) { toast.error('Erreur réseau') }
    finally { setSubmitting(false) }
  }

  // 🕐 Nettoyer le minuteur à la fermeture
  const closeQuiz = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerActive(false)
    setSelectedQuiz(null)
    setResult(null)
  }

  // 🕐 Formater le temps
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 🕐 Couleur du minuteur selon le temps restant
  const getTimerColor = () => {
    if (timeLeft < 60) return 'text-red-400 animate-pulse'
    if (timeLeft < 180) return 'text-yellow-300'
    return 'text-white/70'
  }

  if (loading) return <div className="text-center py-8 text-white/60">Chargement des quiz...</div>
  if (error) return <div className="text-center py-8 text-red-400">Erreur: {error}</div>

  // Quiz en cours
  if (selectedQuiz && !result) {
    const currentQuestion = selectedQuiz.questions?.[currentQuestionIndex]
    const isLastQuestion = currentQuestionIndex === (selectedQuiz.questions?.length || 0) - 1
    if (!currentQuestion) return <div className="text-center py-8 text-white/60">Question non trouvée</div>

    return (
<div className="max-w-2xl mx-auto px-2 sm:px-0">
  <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-normal text-white mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>{selectedQuiz.title}</h3>
              <div className="text-sm text-white/50">Question {currentQuestionIndex + 1} / {selectedQuiz.questions?.length}</div>
            </div>
            {/* 🕐 Minuteur */}
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-1.5">
              <span className="text-sm">⏱️</span>
              <span className={`text-sm font-mono font-bold ${getTimerColor()}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>

          <div className="text-base text-white/90 mb-6">{currentQuestion.question}</div>
          <div className="space-y-3 mb-6">
            {['A', 'B', 'C', 'D'].map(letter => {
              const optionKey = `option_${letter.toLowerCase()}` as keyof typeof currentQuestion
              const optionText = currentQuestion[optionKey] as string
              return (
                <label key={letter}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === letter ? 'bg-indigo-500/20 border-indigo-400/50 text-white' : 'bg-white/[0.04] border-white/[0.1] text-white/70 hover:bg-white/[0.08]'
                  }`}>
                  <input type="radio" name={`q-${currentQuestion.id}`} value={letter}
                    checked={answers[currentQuestion.id] === letter}
                    onChange={() => handleAnswer(currentQuestion.id, letter)} className="w-4 h-4 text-indigo-400 mr-3" />
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

  // Résultat
  if (result && selectedQuiz) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl p-6">
          <h3 className="text-lg font-normal text-white text-center mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>📊 Résultat du quiz</h3>
          <div className="text-center space-y-2 mb-6">
            <div className="text-5xl font-bold text-white">{result.score}/{result.total}</div>
            <div className="text-white/60">Soit {result.percentage.toFixed(0)}%</div>
            {result.percentage === 100 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 p-3 rounded-lg text-sm">🏆 Parfait ! Badge &quot;Expert biblique&quot; débloqué !</div>
            )}
          </div>

          <div className="border-t border-white/[0.08] pt-4 mb-6">
            <h4 className="font-semibold text-white text-sm mb-4">📋 Détail de vos réponses</h4>
            <div className="space-y-4">
              {selectedQuiz.questions?.map((question, index) => {
                const userAnswer = answers[question.id]
                const isCorrect = userAnswer === question.correct_answer
                return (
                  <div key={question.id} className={`p-4 rounded-lg border ${isCorrect ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`text-lg ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>{isCorrect ? '✅' : '❌'}</span>
                      <p className="font-medium text-sm text-white/90">Question {index + 1} : {question.question}</p>
                    </div>
                    <div className="ml-7 space-y-1 text-sm">
                      {['A', 'B', 'C', 'D'].map(letter => {
                        const optionKey = `option_${letter.toLowerCase()}` as keyof typeof question
                        const optionText = question[optionKey] as string
                        const isUserChoice = userAnswer === letter
                        const isCorrectAnswer = question.correct_answer === letter
                        let bgColor = 'bg-white/[0.02]'
                        if (isUserChoice && !isCorrect) bgColor = 'bg-red-500/10'
                        if (isCorrectAnswer) bgColor = 'bg-green-500/10'
                        if (isUserChoice && isCorrect) bgColor = 'bg-green-500/10'
                        return (
                          <div key={letter} className={`p-2 rounded ${bgColor} flex items-center gap-2`}>
                            <span className="font-medium text-white/60">{letter}.</span>
                            <span className="text-white/80">{optionText}</span>
                            {isUserChoice && <span className="text-xs ml-auto text-white/40">← Votre réponse</span>}
                            {isCorrectAnswer && <span className="text-xs ml-auto text-green-400 font-medium">← Bonne réponse</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button onClick={closeQuiz} className="px-4 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors">Fermer</button>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white/10 text-white/70 rounded-lg text-sm hover:bg-white/20 transition-colors">Voir les quiz disponibles</button>
          </div>
        </div>
      </div>
    )
  }

  // Liste des quiz
  const availableQuizzes = quizzes.filter(q => !q.completed)

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-white/[0.08]">
        {[
          { key: 'available', label: `Quiz disponibles (${availableQuizzes.length})` },
          { key: 'history', label: `Mon historique (${myResults.length})` }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`pb-2 px-4 text-sm transition-colors ${activeTab === tab.key ? 'border-b-2 border-white text-white font-medium' : 'text-white/50 hover:text-white/80'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'available' && (
        availableQuizzes.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-8 text-center text-white/40 text-sm">Aucun quiz disponible pour le moment.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableQuizzes.map(quiz => (
              <div key={quiz.id} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 hover:bg-white/[0.06] transition-colors">
                <h4 className="text-white font-medium mb-1">{quiz.title}</h4>
                {quiz.description && <p className="text-white/50 text-sm mb-3">{quiz.description}</p>}
                <div className="flex justify-between text-xs mb-4">
                  <span className="text-white/40">Niveau {quiz.level}</span>
                  <span className="text-white/40">Limite: {new Date(quiz.end_date).toLocaleDateString('fr-FR')}</span>
                </div>
                <button onClick={() => startQuiz(quiz.id)}
                  className="w-full py-2 bg-white/10 text-white/80 rounded-lg text-sm hover:bg-white/20 transition-colors">⏱️ Commencer le quiz (10 min)</button>
              </div>
            ))}
          </div>
        )
      )}

      {activeTab === 'history' && (
        myResults.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-8 text-center text-white/40 text-sm">Vous n&apos;avez pas encore participé à des quiz.</div>
        ) : (
          <div className="space-y-3">
            {myResults.map(result => (
              <div key={result.id} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 flex justify-between items-center">
                <div>
                  <h4 className="text-white font-medium text-sm">{result.quiz?.title}</h4>
                  <p className="text-white/40 text-xs">Niveau {result.quiz?.level} - {new Date(result.submitted_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">{result.score}/{result.total_questions}</div>
                  <div className="text-white/40 text-xs">{result.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
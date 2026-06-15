// components/dashboard/superadmin/QuizSection.tsx
'use client'

import { AdminQuiz } from '@/components/AdminQuiz'
import { AdminQuizHistory } from '@/components/AdminQuizHistory'

interface QuizSectionProps {
  showQuizSection: string | false
  setShowQuizSection: (value: string | false) => void
}

export const QuizSection = ({ showQuizSection, setShowQuizSection }: QuizSectionProps) => {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>📝 Quiz bibliques</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuizSection(showQuizSection === 'create' ? false : 'create')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showQuizSection === 'create' ? 'bg-white text-[#1a3a8f]' : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {showQuizSection === 'create' ? 'Masquer création' : 'Créer quiz'}
          </button>
          <button
            onClick={() => setShowQuizSection(showQuizSection === 'history' ? false : 'history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showQuizSection === 'history' ? 'bg-white text-[#1a3a8f]' : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {showQuizSection === 'history' ? 'Masquer historique' : 'Historique quiz'}
          </button>
        </div>
      </div>
      {showQuizSection === 'create' && <AdminQuiz />}
      {showQuizSection === 'history' && <AdminQuizHistory />}
    </div>
  )
}
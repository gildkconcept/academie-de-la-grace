// services/quizService.ts

export const quizService = {
  async getAll() {
    const res = await fetch('/api/quizzes', { credentials: 'include' })
    return res.json()
  },

  async getById(id: string) {
    const res = await fetch(`/api/quizzes?id=${id}`, { credentials: 'include' })
    return res.json()
  },

  async create(data: any) {
    const res = await fetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    })
    return res.json()
  },

  async submit(quizId: string, answers: Record<string, string>) {
    const res = await fetch(`/api/quizzes/${quizId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ answers })
    })
    return res.json()
  },

  async getMyResults() {
    const res = await fetch('/api/my-results', { credentials: 'include' })
    return res.json()
  },

  async getAllResults(quizId?: string, level?: string) {
    let url = '/api/quiz-results?'
    if (quizId && quizId !== 'all') url += `quizId=${quizId}&`
    if (level && level !== 'all') url += `level=${level}&`
    const res = await fetch(url, { credentials: 'include' })
    return res.json()
  }
}
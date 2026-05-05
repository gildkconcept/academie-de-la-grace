// services/sessionService.ts

export const sessionService = {
  async getTypes() {
    const res = await fetch('/api/session-types', { credentials: 'include' })
    return res.json()
  },

  async getAllSessions() {
    const res = await fetch('/api/service/session/all', { credentials: 'include' })
    return res.json()
  },

  async getAttendance(sessionId: string) {
    const res = await fetch(`/api/service/session/get?sessionId=${sessionId}`, {
      credentials: 'include'
    })
    return res.json()
  }
}
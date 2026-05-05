// services/attendanceService.ts

export const attendanceService = {
  async verifyCode(code: string) {
    const res = await fetch('/api/code/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code })
    })
    return res.json()
  },

  async generateCode(lat?: number, lng?: number, radius?: number) {
    const res = await fetch('/api/code/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ lat, lng, radius })
    })
    return res.json()
  },

  async markServiceAttendance(sessionId: string, attendances: { studentId: string; status: string }[]) {
    const res = await fetch('/api/service/attendance/mark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sessionId, attendances })
    })
    return res.json()
  },

  async getCurrentSession() {
    const res = await fetch('/api/service/session/current', {
      credentials: 'include'
    })
    return res.json()
  },

  async startServiceSession(date: string, type: string) {
    const res = await fetch('/api/service/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ date, type })
    })
    return res.json()
  },

  async getSessionHistory(limit = 20, offset = 0) {
    const res = await fetch(`/api/service/session/history?limit=${limit}&offset=${offset}`, {
      credentials: 'include'
    })
    return res.json()
  },

  async getSessionStudents(sessionId: string) {
    const res = await fetch(`/api/service/session/get?sessionId=${sessionId}`, {
      credentials: 'include'
    })
    return res.json()
  }
}
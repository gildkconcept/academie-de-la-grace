// services/studentService.ts

export const studentService = {
  async getAll(serviceId?: string) {
    const url = serviceId ? `/api/students?serviceId=${serviceId}` : '/api/students'
    const res = await fetch(url, { credentials: 'include' })
    return res.json()
  },

  async delete(id: string) {
    const res = await fetch(`/api/students/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    return res.json()
  },

  async updateLevel(id: string, level: number) {
    const res = await fetch(`/api/students/${id}/level`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ level })
    })
    return res.json()
  },

  async add(data: {
    fullName: string
    username: string
    branch: string
    level: string
    baptized: string | boolean
    phone?: string
    password: string
    serviceId: string
  }) {
    const res = await fetch('/api/students/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    })
    return res.json()
  }
}
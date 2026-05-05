// services/statsService.ts

export const statsService = {
  async getGlobal() {
    const res = await fetch('/api/stats/global', { credentials: 'include' })
    return res.json()
  },

  async getAttendanceStats(serviceId?: string, method?: string) {
    let url = '/api/stats/attendance?'
    if (serviceId && serviceId !== 'all') url += `serviceId=${serviceId}&`
    if (method && method !== 'all') url += `method=${method}&`
    const res = await fetch(url, { credentials: 'include' })
    return res.json()
  },

  async getServiceAttendance(date: string, serviceId?: string, type?: string) {
    let url = `/api/service/attendance/all?date=${date}`
    if (serviceId && serviceId !== 'all') url += `&serviceId=${serviceId}`
    if (type && type !== 'all') url += `&type=${type}`
    const res = await fetch(url, { credentials: 'include' })
    return res.json()
  }
}